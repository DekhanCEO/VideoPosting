// Test d'intégration du serveur Node.js (versions Windows / macOS et npm start) contre un faux serveur de plateformes.
// Prérequis : BUILD_TARGET=standalone npx next build   (ou npm run package:desktop)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { startMock } from "../php/mock-platforms.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const PORT = 8290;
const MOCK_PORT = 8291;
const BASE = `http://127.0.0.1:${PORT}`;
let server;
let mock;
let dataDir;
let appDir;
const cookies = new Map();

async function call(url, init = {}) {
  const res = await fetch(BASE + url, {
    redirect: "manual",
    ...init,
    headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...(init.headers ?? {}) },
  });
  for (const c of res.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (v) cookies.set(k, v);
    else cookies.delete(k);
  }
  return res;
}
const json = async (url, init = {}) => {
  const res = await call(url, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) }, body: init.json === undefined ? init.body : JSON.stringify(init.json) });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

before(async () => {
  const standalone = path.join(root, ".next", "standalone");
  if (!fs.existsSync(path.join(standalone, "server.js"))) throw new Error("Lancez d'abord : BUILD_TARGET=standalone npx next build");
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "vp-node-"));
  // Copie hors du projet : comme dans les paquets Windows/macOS, aucun node_modules parent ne doit compléter le serveur.
  appDir = fs.mkdtempSync(path.join(os.tmpdir(), "vp-app-"));
  fs.cpSync(standalone, appDir, { recursive: true, verbatimSymlinks: true });
  for (const p of ["data", "node_modules/@img", "node_modules/sharp"]) fs.rmSync(path.join(appDir, p), { recursive: true, force: true });
  const entry = path.join(appDir, "server.js");
  mock = await startMock(MOCK_PORT);
  server = spawn(process.execPath, [entry], {
    env: { ...process.env, PORT: String(PORT), HOSTNAME: "127.0.0.1", DATA_DIR: dataDir, VP_API_MOCK_BASE: `http://127.0.0.1:${MOCK_PORT}`, PUBLIC_URL: BASE, APP_PASSWORD: "" },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${BASE}/api/session`)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("Le serveur Node n'a pas démarré");
});

after(() => {
  server?.kill();
  mock?.server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(appDir, { recursive: true, force: true });
});

test("connexion OAuth des trois plateformes", async () => {
  const put = await json("/api/settings", {
    method: "PUT",
    json: {
      demoMode: false,
      credentials: {
        youtube: { clientId: "yt-id", clientSecret: "yt-secret" },
        tiktok: { clientKey: "tt-key", clientSecret: "tt-secret" },
        instagram: { appId: "ig-id", appSecret: "ig-secret", loginType: "instagram" },
      },
    },
  });
  assert.equal(put.status, 200);
  for (const platform of ["youtube", "tiktok", "instagram"]) {
    const res = await call(`/api/auth/${platform}/connect`);
    assert.ok([302, 307].includes(res.status), `${platform} ${res.status}`);
    const state = new URL(res.headers.get("location")).searchParams.get("state");
    const back = await call(`/api/auth/${platform}/callback?code=abc&state=${state}`);
    assert.equal(new URL(back.headers.get("location")).search, `?connected=${platform}`);
  }
  const accounts = (await json("/api/accounts")).data;
  assert.deepEqual(accounts.map((a) => a.name).sort(), ["Créateur IG", "Créateur TT", "Ma chaîne"]);
});

test("publication réelle sur les trois plateformes", { timeout: 120_000 }, async () => {
  const video = crypto.randomBytes(23 * 1024 * 1024 + 4321);
  const hash = crypto.createHash("sha256").update(video).digest("hex");
  const created = await json("/api/media", { method: "POST", json: { fileName: "clip.mp4", size: video.length, mimeType: "video/mp4" } });
  const { id, chunkSize } = created.data;
  for (let offset = 0; offset < video.length; offset += chunkSize) {
    const res = await call(`/api/media/${id}/chunk?offset=${offset}`, { method: "POST", body: video.subarray(offset, offset + chunkSize), headers: { "content-type": "application/octet-stream" } });
    assert.equal(res.status, 200);
  }
  await json(`/api/media/${id}/complete`, { method: "POST", json: { duration: 20, width: 1080, height: 1920 } });
  const options = {
    youtube: { title: "", description: "", tags: [], sync: { title: true, description: true, tags: true }, categoryId: "22", privacy: "unlisted", madeForKids: false, notifySubscribers: false, embeddable: true, license: "youtube", containsSyntheticMedia: false, defaultLanguage: "fr" },
    tiktok: { caption: "", sync: { caption: true }, mode: "direct", privacyLevel: "PUBLIC_TO_EVERYONE", allowComments: true, allowDuet: true, allowStitch: true, coverTimestampMs: 1500, commercialContent: false, yourBrand: false, brandedContent: false, isAigc: false },
    instagram: { caption: "", sync: { caption: true }, shareToFeed: true, thumbOffsetMs: 0, collaborators: ["@ami"], audioName: "", locationId: "" },
  };
  const post = await json("/api/posts", { method: "POST", json: { action: "publish", input: { mediaId: id, common: { title: "Test intégration", description: "Description", hashtags: ["test"] }, platforms: ["tiktok", "youtube", "instagram"], options } } });
  assert.equal(post.status, 200, JSON.stringify(post.data));
  let current;
  for (let i = 0; i < 200; i++) {
    current = (await json(`/api/posts/${post.data.id}`)).data;
    if (current.status !== "publishing") break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const pubs = current.publications;
  assert.equal(current.status, "published", JSON.stringify(Object.fromEntries(Object.entries(pubs).map(([k, v]) => [k, [v.status, v.error]]))));
  assert.equal(pubs.youtube.url, "https://www.youtube.com/shorts/vid123");
  assert.equal(pubs.tiktok.url, "https://www.tiktok.com/@createur.tt/video/7300000000000000001");
  assert.equal(pubs.instagram.url, "https://www.instagram.com/reel/ABC123/");
  assert.equal(mock.state.yt.failedOnce, true);
  assert.equal(mock.state.yt.hash, hash);
  assert.equal(mock.state.tt.hash, hash);
  assert.equal(mock.state.tt.init.post_info.disable_duet, true);
  assert.equal(mock.state.ig.downloaded, 200);
  assert.equal(mock.state.ig.hash, hash);
});

test("synchronisation des statistiques", async () => {
  const sync = await json("/api/analytics/sync", { method: "POST" });
  assert.ok(sync.data.reports.every((r) => r.ok), JSON.stringify(sync.data));
  const a = (await json("/api/analytics?range=28")).data;
  assert.deepEqual(Object.fromEntries(a.platforms.map((p) => [p.platform, p.followers])), { tiktok: 5000, youtube: 1234, instagram: 3200 });
  assert.equal(a.topPosts[0].totalViews, 500 + 1500 + 900);
});
