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

test("publication photo : carrousel Instagram et photos TikTok", { timeout: 60_000 }, async () => {
  const upload = async (bytes, width, height) => {
    const created = await json("/api/media", { method: "POST", json: { fileName: "photo.jpg", size: bytes.length, mimeType: "image/jpeg" } });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    await call(`/api/media/${created.data.id}/chunk?offset=0`, { method: "POST", body: bytes, headers: { "content-type": "application/octet-stream" } });
    const done = await json(`/api/media/${created.data.id}/complete`, { method: "POST", json: { width, height } });
    assert.equal(done.data.status, "ready");
    return created.data.id;
  };
  const photos = [crypto.randomBytes(30_000), crypto.randomBytes(20_000), crypto.randomBytes(25_000)];
  const ids = [];
  for (const p of photos) ids.push(await upload(p, 1080, 1350));
  const options = {
    youtube: { title: "", description: "", tags: [], sync: { title: true, description: true, tags: true }, categoryId: "22", privacy: "public", madeForKids: false, notifySubscribers: true, embeddable: true, license: "youtube", containsSyntheticMedia: false, defaultLanguage: "fr", format: "auto" },
    tiktok: { caption: "", sync: { caption: true }, mode: "direct", privacyLevel: "SELF_ONLY", allowComments: false, allowDuet: true, allowStitch: true, coverTimestampMs: 0, commercialContent: false, yourBrand: false, brandedContent: false, isAigc: false, autoAddMusic: false },
    instagram: { caption: "", sync: { caption: true }, shareToFeed: true, thumbOffsetMs: 0, collaborators: [], audioName: "", locationId: "" },
  };
  const input = (platforms) => ({ kind: "photo", imageIds: ids, common: { title: "Trois photos", description: "", hashtags: [] }, platforms, options });
  const refused = await json("/api/posts", { method: "POST", json: { action: "publish", input: input(["youtube"]) } });
  assert.equal(refused.status, 422);
  const post = await json("/api/posts", { method: "POST", json: { action: "publish", input: input(["tiktok", "instagram"]) } });
  assert.equal(post.status, 200, JSON.stringify(post.data));
  let current;
  for (let i = 0; i < 100; i++) {
    current = (await json(`/api/posts/${post.data.id}`)).data;
    if (current.status !== "publishing") break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const pubs = current.publications;
  assert.equal(current.status, "published", JSON.stringify(Object.fromEntries(Object.entries(pubs).map(([k, v]) => [k, [v.status, v.error]]))));
  assert.equal(pubs.instagram.url, "https://www.instagram.com/p/PHOTO123/");
  assert.equal(pubs.tiktok.url, "https://www.tiktok.com/@createur.tt/photo/7300000000000000002");
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
  assert.deepEqual(mock.state.ig.images.map((x) => x.hash), photos.map(sha));
  assert.equal(mock.state.ig.carousel.children.length, 3);
  assert.deepEqual(mock.state.tt.photoDownloads.map((d) => d.hash), photos.map(sha));
  assert.equal(mock.state.tt.photoInit.post_info.auto_add_music, false);
  assert.equal(mock.state.tt.photoInit.post_info.disable_comment, true);
  assert.equal(current.images.length, 3);
});

test("annonces Discord : webhooks, message de test, liens envoyés à la publication", { timeout: 90_000 }, async () => {
  const hookUrl = (id, token) => `https://discord.com/api/webhooks/${id}/${token}`;
  const create = (body) => json("/api/discord/webhooks", { method: "POST", json: { message: "", mention: "none", style: "links", timing: "each", enabled: true, ...body } });
  assert.equal((await create({ name: "Pirate", url: "https://evil.example.com/api/webhooks/123456/abcdefghijklmnopqrstuvwxyz", platforms: ["youtube"] })).status, 422);
  assert.equal((await create({ name: "Rôle", url: hookUrl("123456", "abcdefghijklmnopqrstuvwxyz"), platforms: ["youtube"], mention: "role", roleId: "" })).status, 422);

  const each = await create({ name: "Annonces", url: hookUrl("111111111111", "tokenAAAAAAAAAAAAAAAAAAAAAA"), platforms: ["tiktok", "youtube", "instagram"], mention: "role", roleId: "222222222222" });
  assert.equal(each.status, 201, JSON.stringify(each.data));
  assert.equal(each.data.urlHint, "discord.com/api/webhooks/1111…1111/••••••");
  assert.ok(!JSON.stringify((await json("/api/discord/webhooks")).data).includes("tokenAAAA"), "jeton jamais renvoyé");
  const grouped = (await create({ name: "Récap", url: hookUrl("333333333333", "tokenBBBBBBBBBBBBBBBBBBBBBB"), platforms: ["youtube", "tiktok"], timing: "grouped", style: "card", mention: "everyone", username: "Malabop" })).data;
  const gone = (await create({ name: "Supprimé", url: hookUrl("555555555555", "goneDDDDDDDDDDDDDDDDDDDDDD"), platforms: ["instagram"] })).data;

  mock.state.discord.failNext = 1;
  assert.equal((await json(`/api/discord/webhooks/${each.data.id}/test`, { method: "POST" })).status, 200);
  const testMsg = mock.state.discord.messages.at(-1);
  assert.equal(testMsg.wait, "true");
  assert.match(testMsg.payload.content, /^<@&222222222222> 🎬 \*\*Message de test Uplink\*\*/);
  const failed = await json(`/api/discord/webhooks/${gone.id}/test`, { method: "POST" });
  assert.equal(failed.status, 502);
  assert.match(failed.data.error, /invalide ou supprimé/);

  const created = await json("/api/media", { method: "POST", json: { fileName: "d.mp4", size: 2000, mimeType: "video/mp4" } });
  await call(`/api/media/${created.data.id}/chunk?offset=0`, { method: "POST", body: crypto.randomBytes(2000), headers: { "content-type": "application/octet-stream" } });
  await json(`/api/media/${created.data.id}/complete`, { method: "POST", json: { duration: 15, width: 1080, height: 1920 } });
  const options = {
    youtube: { title: "", description: "", tags: [], sync: { title: true, description: true, tags: true }, categoryId: "22", privacy: "public", madeForKids: false, notifySubscribers: true, embeddable: true, license: "youtube", containsSyntheticMedia: false, defaultLanguage: "fr", format: "auto" },
    tiktok: { caption: "", sync: { caption: true }, mode: "direct", privacyLevel: "PUBLIC_TO_EVERYONE", allowComments: true, allowDuet: true, allowStitch: true, coverTimestampMs: 0, commercialContent: false, yourBrand: false, brandedContent: false, isAigc: false, autoAddMusic: true },
    instagram: { caption: "", sync: { caption: true }, shareToFeed: true, thumbOffsetMs: 0, collaborators: [], audioName: "", locationId: "" },
  };
  const publish = async (platforms, extra = {}) => {
    const post = await json("/api/posts", {
      method: "POST",
      json: { action: "publish", input: { mediaId: created.data.id, common: { title: "Annonce Discord", description: "Nouvelle vidéo", hashtags: [] }, platforms, options, ...extra } },
    });
    assert.equal(post.status, 200, JSON.stringify(post.data));
    let current;
    for (let i = 0; i < 200; i++) {
      current = (await json(`/api/posts/${post.data.id}`)).data;
      if (current.status !== "publishing") break;
      await new Promise((r) => setTimeout(r, 300));
    }
    assert.equal(current.status, "published", JSON.stringify(Object.fromEntries(Object.entries(current.publications).map(([k, v]) => [k, [v.status, v.error]]))));
    await new Promise((r) => setTimeout(r, 800));
    return (await json(`/api/posts/${post.data.id}`)).data;
  };
  const before = mock.state.discord.messages.length;
  mock.state.yt.forcePrivate = true; // projet Google non audité
  const post = await publish(["tiktok", "youtube", "instagram"]);
  mock.state.yt.forcePrivate = false;
  assert.match(post.publications.youtube.notice, /YouTube a mis la vidéo en privé/);
  assert.equal(post.publications.instagram.notice, undefined);
  const sent = mock.state.discord.messages.slice(before);
  const eachMsgs = sent.filter((m) => m.id === "111111111111");
  assert.equal(eachMsgs.length, 3);
  for (const platform of ["tiktok", "youtube", "instagram"]) {
    assert.ok(eachMsgs.some((m) => m.payload.content.includes(post.publications[platform].url)), `lien ${platform} annoncé`);
  }
  const groupedMsgs = sent.filter((m) => m.id === "333333333333");
  assert.equal(groupedMsgs.length, 1);
  assert.equal(groupedMsgs[0].payload.username, "Malabop");
  assert.match(groupedMsgs[0].payload.content, /^@everyone /);
  assert.deepEqual(groupedMsgs[0].payload.embeds[0].fields.map((f) => f.name).sort(), ["▶️ YouTube", "🎵 TikTok"]);
  assert.equal(groupedMsgs[0].payload.embeds[0].thumbnail.url, "https://i.ytimg.com/vi/vid123/hqdefault.jpg");
  assert.ok(post.publications.instagram.logs.some((l) => l.level === "warn" && /Discord \(« Supprimé »\)/.test(l.message)));
  assert.equal(post.status, "published");

  const before2 = mock.state.discord.messages.length;
  const second = await publish(["tiktok"], { discordWebhookIds: [grouped.id] });
  assert.deepEqual(second.discordWebhookIds, [grouped.id]);
  assert.deepEqual(mock.state.discord.messages.slice(before2).map((m) => m.id), ["333333333333"]);

  for (const id of [post.id, second.id]) await json(`/api/posts/${id}`, { method: "DELETE" });
  assert.equal((await json(`/api/discord/webhooks/${gone.id}`, { method: "DELETE" })).status, 200);
  assert.deepEqual((await json("/api/discord/webhooks")).data.map((h) => h.name), ["Annonces", "Récap"]);
});

test("pages légales : publiques, pré-rendues, informations de l'éditeur", async () => {
  for (const [path, title] of [["/conditions", "Conditions d&#x27;utilisation"], ["/confidentialite", "Politique de confidentialité"]]) {
    const res = await fetch(BASE + path);
    assert.equal(res.status, 200, path);
    const html = await res.text();
    assert.ok(html.includes(title), `${path} : titre`);
    assert.ok(html.includes("YouTube"), `${path} : texte pré-rendu`);
  }
  assert.ok((await (await fetch(`${BASE}/confidentialite`)).text()).includes('id="suppression"'), "ancre des instructions de suppression (Meta)");
  assert.deepEqual((await json("/api/legal")).data, { serviceName: "Uplink", editor: "", email: "" });
  assert.equal((await json("/api/settings", { method: "PUT", json: { legal: { email: "faux" } } })).status, 422);
  const saved = await json("/api/settings", { method: "PUT", json: { legal: { editor: "Malabop", email: "contact@malabop.fr" } } });
  assert.deepEqual(saved.data.legal, { serviceName: "Uplink", editor: "Malabop", email: "contact@malabop.fr" });
  assert.deepEqual((await json("/api/legal")).data, saved.data.legal);
});

test("synchronisation des statistiques", async () => {
  const sync = await json("/api/analytics/sync", { method: "POST" });
  assert.ok(sync.data.reports.every((r) => r.ok), JSON.stringify(sync.data));
  const a = (await json("/api/analytics?range=28")).data;
  assert.deepEqual(Object.fromEntries(a.platforms.map((p) => [p.platform, p.followers])), { tiktok: 5000, youtube: 1234, instagram: 3200 });
  assert.equal(a.topPosts[0].totalViews, 500 + 1500 + 900);
  assert.equal(a.topPosts[0].platforms.youtube.shares, 25);
  assert.equal(a.topPosts[0].platforms.youtube.followersGained, 7);
  assert.equal(a.topPosts[0].platforms.instagram.reach, 700);
  assert.ok(Math.abs(a.audience.youtube.gender.female - 0.55) < 1e-9);
  assert.deepEqual(a.audience.youtube.countries.map((c) => c.code), ["FR", "BE", "CA"]);
  assert.equal(a.audience.instagram.cities[0].name, "Paris");
  assert.equal(a.audience.tiktok, undefined);

  const saved = await json("/api/analytics/audience/tiktok", { method: "PUT", json: { gender: { female: 60, male: 40 }, countries: [{ code: "fr", share: 80 }] } });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const after = (await json("/api/analytics?range=28")).data;
  assert.equal(after.audience.tiktok.source, "manual");
  assert.deepEqual(after.audience.tiktok.countries, [{ code: "FR", share: 0.8 }]);
  assert.equal((await json("/api/analytics/audience/tiktok", { method: "PUT", json: {} })).status, 422);
});
