// Test d'intégration de la version PHP (hébergement mutualisé) contre un faux serveur de plateformes.
// Usage : npm run test:php   (nécessite PHP 8.1+ en ligne de commande)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { startMock } from "./mock-platforms.mjs";

const root = path.resolve(import.meta.dirname, "..", "..");
const PHP_PORT = 8190;
const MOCK_PORT = 8191;
const BASE = `http://127.0.0.1:${PHP_PORT}/posting`;
const api = (route, query = "") => `${BASE}/api/index.php?r=${encodeURIComponent(route)}${query}`;

let php;
let mock;
let docroot;
const cookies = new Map();

async function call(url, init = {}) {
  const res = await fetch(url, {
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
  const res = await call(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    body: init.json === undefined ? init.body : JSON.stringify(init.json),
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
};

before(async () => {
  docroot = fs.mkdtempSync(path.join(os.tmpdir(), "vp-php-"));
  const app = path.join(docroot, "posting");
  fs.cpSync(path.join(root, "hosting", "php", "api"), path.join(app, "api"), { recursive: true });
  fs.cpSync(path.join(root, "hosting", "php", "data"), path.join(app, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(app, "api", "config.php"),
    `<?php return ['setup_code' => 'TEST-CODE-0000', 'api_mock_base' => 'http://127.0.0.1:${MOCK_PORT}'];`,
  );
  mock = await startMock(MOCK_PORT);
  // Fonctions souvent désactivées sur les hébergements mutualisés : l'application doit s'en passer.
  const disabled = "set_time_limit,disk_free_space,getmypid,litespeed_finish_request";
  php = spawn("php", ["-d", `disable_functions=${disabled}`, "-S", `127.0.0.1:${PHP_PORT}`, "-t", docroot], { env: { ...process.env, PHP_CLI_SERVER_WORKERS: "4" }, stdio: "ignore" });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(api("/session"));
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error("Le serveur PHP n'a pas démarré");
});

after(() => {
  php?.kill();
  mock?.server.close();
  fs.rmSync(docroot, { recursive: true, force: true });
});

test("installation : code obligatoire puis mot de passe", async () => {
  assert.equal((await json(api("/settings"))).status, 401);
  assert.equal((await json(api("/session"), { method: "POST", json: { password: "secret123", setupCode: "NOPE" } })).status, 401);
  const ok = await json(api("/session"), { method: "POST", json: { password: "secret123", setupCode: "test-code-0000" } });
  assert.equal(ok.status, 200);
  const s = await json(api("/session"));
  assert.deepEqual(s.data, { authenticated: true, passwordRequired: true, setupRequired: false });
});

test("connexion OAuth des trois plateformes", async () => {
  const put = await json(api("/settings"), {
    method: "POST",
    headers: { "X-HTTP-Method-Override": "PUT" },
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
  assert.equal(put.data.redirectUris.youtube, `${BASE}/api/callback.php`);

  for (const platform of ["youtube", "tiktok", "instagram"]) {
    const res = await call(api(`/auth/${platform}/connect`));
    assert.equal(res.status, 302, platform);
    const location = new URL(res.headers.get("location"));
    const state = location.searchParams.get("state");
    assert.ok(state.startsWith(`${platform}.`));
    assert.equal(location.searchParams.get("redirect_uri"), `${BASE}/api/callback.php`);
    const back = await call(`${BASE}/api/callback.php?code=abc&state=${encodeURIComponent(state)}`);
    assert.equal(back.headers.get("location"), `${BASE}/accounts/?connected=${platform}`);
  }
  const accounts = (await json(api("/accounts"))).data;
  assert.deepEqual(accounts.map((a) => a.name).sort(), ["Créateur IG", "Créateur TT", "Ma chaîne"]);
  assert.ok(accounts.every((a) => !a.needsReconnect && !a.demo));
});

test("envoi par morceaux puis publication réelle sur les trois plateformes", { timeout: 120_000 }, async () => {
  const video = crypto.randomBytes(23 * 1024 * 1024 + 4321);
  const hash = crypto.createHash("sha256").update(video).digest("hex");
  const created = await json(api("/media"), { method: "POST", json: { fileName: "clip.mp4", size: video.length, mimeType: "video/mp4" } });
  assert.equal(created.status, 201);
  const { id, chunkSize } = created.data;
  for (let offset = 0; offset < video.length; offset += chunkSize) {
    const res = await call(api(`/media/${id}/chunk`, `&offset=${offset}`), { method: "POST", body: video.subarray(offset, offset + chunkSize), headers: { "content-type": "application/octet-stream" } });
    assert.equal(res.status, 200);
  }
  const done = await json(api(`/media/${id}/complete`), { method: "POST", json: { duration: 20, width: 1080, height: 1920 } });
  assert.equal(done.data.status, "ready");

  const options = {
    youtube: { title: "", description: "", tags: [], sync: { title: true, description: true, tags: true }, categoryId: "22", privacy: "unlisted", madeForKids: false, notifySubscribers: false, embeddable: true, license: "youtube", containsSyntheticMedia: false, defaultLanguage: "fr" },
    tiktok: { caption: "", sync: { caption: true }, mode: "direct", privacyLevel: "PUBLIC_TO_EVERYONE", allowComments: true, allowDuet: true, allowStitch: true, coverTimestampMs: 1500, commercialContent: false, yourBrand: false, brandedContent: false, isAigc: false },
    instagram: { caption: "", sync: { caption: true }, shareToFeed: true, thumbOffsetMs: 0, collaborators: ["@ami"], audioName: "", locationId: "" },
  };
  const post = await json(api("/posts"), {
    method: "POST",
    json: { action: "publish", input: { mediaId: id, common: { title: "Test intégration", description: "Description", hashtags: ["test"] }, platforms: ["tiktok", "youtube", "instagram"], options } },
  });
  assert.equal(post.status, 200, JSON.stringify(post.data));

  let current;
  for (let i = 0; i < 200; i++) {
    current = (await json(api(`/posts/${post.data.id}`))).data;
    if (current.status !== "publishing") break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const pubs = current.publications;
  assert.equal(current.status, "published", JSON.stringify(Object.fromEntries(Object.entries(pubs).map(([k, v]) => [k, [v.status, v.error]]))));
  assert.equal(pubs.youtube.url, "https://www.youtube.com/shorts/vid123");
  assert.equal(pubs.tiktok.url, "https://www.tiktok.com/@createur.tt/video/7300000000000000001");
  assert.equal(pubs.instagram.url, "https://www.instagram.com/reel/ABC123/");
  assert.ok(!("job" in pubs.youtube), "l'état interne n'est pas exposé");

  // YouTube : fichier reçu intact malgré la panne simulée, métadonnées correctes.
  assert.equal(mock.state.yt.failedOnce, true);
  assert.equal(mock.state.yt.hash, hash);
  assert.equal(mock.state.yt.meta.snippet.title, "Test intégration");
  assert.deepEqual(mock.state.yt.meta.snippet.tags, ["test"]);
  assert.equal(mock.state.yt.meta.status.privacyStatus, "unlisted");
  // TikTok : morceaux contigus, réglages du créateur respectés (duo désactivé côté compte).
  assert.equal(mock.state.tt.hash, hash);
  assert.equal(mock.state.tt.init.post_info.privacy_level, "PUBLIC_TO_EVERYONE");
  assert.equal(mock.state.tt.init.post_info.disable_duet, true);
  assert.equal(mock.state.tt.init.post_info.title, "Test intégration\n\nDescription\n\n#test");
  assert.equal(mock.state.tt.init.source_info.total_chunk_count, 2);
  // Instagram : la vidéo a été téléchargée via l'URL signée.
  assert.equal(mock.state.ig.downloaded, 200);
  assert.equal(mock.state.ig.hash, hash);
  assert.equal(mock.state.ig.container.media_type, "REELS");
  assert.equal(mock.state.ig.container.collaborators, '["ami"]');
  // Lien signé falsifié refusé.
  const forged = mock.state.ig.container.video_url.replace(/sig=[^&]+/, "sig=abc");
  assert.equal((await fetch(forged)).status, 403);
});

test("synchronisation des statistiques", async () => {
  const sync = await json(api("/analytics/sync"), { method: "POST" });
  assert.ok(sync.data.reports.every((r) => r.ok), JSON.stringify(sync.data));
  const a = (await json(api("/analytics", "&range=28"))).data;
  const followers = Object.fromEntries(a.platforms.map((p) => [p.platform, p.followers]));
  assert.deepEqual(followers, { tiktok: 5000, youtube: 1234, instagram: 3200 });
  assert.equal(a.topPosts[0].totalViews, 500 + 1500 + 900);
  const revenue = (await json(api("/revenue"))).data;
  assert.ok(revenue.entries.some((e) => e.auto && e.amount === 12.5), "revenus YouTube importés");
});
