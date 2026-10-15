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
let appDir;

/** Navigateur minimal : chaque utilisateur a ses propres cookies. */
function browser() {
  const cookies = new Map();
  const call = async (url, init = {}) => {
    const res = await fetch(url, {
      redirect: "manual",
      ...init,
      headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...(init.headers ?? {}) },
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const [k, v] = pair.split("=");
      if (v && !/max-age=0/i.test(c)) cookies.set(k, v);
      else cookies.delete(k);
    }
    return res;
  };
  const json = async (url, init = {}) => {
    const res = await call(url, {
      ...init,
      headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      body: init.json === undefined ? init.body : JSON.stringify(init.json),
    });
    const text = await res.text();
    return { status: res.status, data: text ? JSON.parse(text) : null };
  };
  /** Parcours « Se connecter avec Twitch » : l'utilisateur Twitch est désigné par le code renvoyé. */
  const twitchLogin = async (login, authorizeUrl) => {
    if (!authorizeUrl) {
      const res = await call(api("/auth/twitch/login"));
      assert.equal(res.status, 302);
      authorizeUrl = res.headers.get("location");
    }
    const state = new URL(authorizeUrl).searchParams.get("state");
    const back = await call(`${BASE}/api/callback.php?code=code-${login}&state=${encodeURIComponent(state)}&scope=user%3Aread%3Aemail`);
    assert.equal(back.status, 302);
    return back.headers.get("location");
  };
  return { call, json, twitchLogin, cookies };
}
const PUT = { method: "POST", headers: { "X-HTTP-Method-Override": "PUT" } };
const DELETE = { method: "POST", headers: { "X-HTTP-Method-Override": "DELETE" } };

const owner = browser();
const { call, json } = owner;

before(async () => {
  // Dossier public du site = …/www ; le .env de test sera déposé au-dessus (hors du dossier public).
  docroot = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "vp-php-")), "www");
  appDir = path.join(docroot, "posting");
  fs.cpSync(path.join(root, "hosting", "php", "api"), path.join(appDir, "api"), { recursive: true });
  fs.cpSync(path.join(root, "hosting", "php", "data"), path.join(appDir, "data"), { recursive: true });
  fs.writeFileSync(
    path.join(appDir, "api", "config.php"),
    `<?php return ['setup_code' => 'TEST-CODE-0000', 'api_mock_base' => 'http://127.0.0.1:${MOCK_PORT}'];`,
  );
  // Données d'une installation précédente (version mono-utilisateur) : reprises dans l'espace de l'administrateur.
  const legacy = {
    version: 1,
    secret: "old",
    passwordHash: "x",
    settings: { demoMode: true, credentials: { youtube: { clientId: "old-yt-id", clientSecret: "old-yt-secret" } }, hashtagGroups: [{ id: "g1", name: "Ancien", tags: ["old"] }] },
    accounts: [],
    posts: [{ id: "legacy-post", status: "draft", mediaId: null, common: { title: "Ancien brouillon", description: "", hashtags: [] }, platforms: [], publications: {}, createdAt: 1, updatedAt: 1 }],
    media: [],
  };
  fs.writeFileSync(path.join(appDir, "data", "db.php"), "<?php exit; ?>\n" + JSON.stringify(legacy));
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
  fs.rmSync(path.dirname(docroot), { recursive: true, force: true });
});

test("installation : code d'installation, application Twitch, puis connexion Twitch de l'administrateur", async () => {
  assert.equal((await json(api("/settings"))).status, 401);
  const initial = (await json(api("/session"))).data;
  assert.equal(initial.setupRequired, true);
  assert.equal(initial.loginMethod, "twitch");
  assert.equal(initial.twitchConfigured, false);
  assert.equal(initial.redirectUri, `${BASE}/api/callback.php`);

  const setup = (body) => json(api("/session/setup"), { method: "POST", json: body });
  assert.equal((await setup({ setupCode: "NOPE", clientId: "tw-client", clientSecret: "tw-secret" })).status, 401);
  const badSecret = await setup({ setupCode: "test-code-0000", clientId: "tw-client", clientSecret: "wrong" });
  assert.equal(badSecret.status, 422);
  assert.match(badSecret.data.error, /Twitch refuse/);
  const ok = await setup({ setupCode: "test-code-0000", clientId: "tw-client", clientSecret: "tw-secret" });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  const authorize = new URL(ok.data.redirect);
  assert.equal(authorize.origin + authorize.pathname, "https://id.twitch.tv/oauth2/authorize");
  assert.equal(authorize.searchParams.get("client_id"), "tw-client");
  assert.equal(authorize.searchParams.get("redirect_uri"), `${BASE}/api/callback.php`);
  assert.equal(authorize.searchParams.get("response_type"), "code");

  // Un inconnu qui tente de se connecter pendant l'installation n'obtient rien.
  const intruder = browser();
  assert.match(decodeURIComponent(await intruder.twitchLogin("intrus")), /\/login\/\?error=Terminez/);
  assert.equal((await intruder.json(api("/posts"))).status, 401);

  assert.equal(await owner.twitchLogin("malabop", ok.data.redirect), `${BASE}/`);
  assert.ok(!owner.cookies.has("vp_setup"), "cookie d'installation supprimé");
  const s = (await json(api("/session"))).data;
  assert.equal(s.authenticated, true);
  assert.equal(s.setupRequired, false);
  assert.deepEqual(s.user, { id: s.user.id, login: "malabop", displayName: "Malabop", avatarUrl: "https://static-cdn.jtvnw.net/malabop.png", role: "admin" });
  assert.ok(mock.state.twitch.revoked.includes("tw-malabop"), "jeton Twitch révoqué après identification");
  assert.equal((await setup({ setupCode: "test-code-0000", clientId: "tw-client", clientSecret: "tw-secret" })).status, 409);

  // Reprise de l'ancienne installation dans l'espace de l'administrateur.
  const posts = (await json(api("/posts"))).data;
  assert.deepEqual(posts.map((p) => p.title ?? p.common.title), ["Ancien brouillon"]);
  const settings = (await json(api("/settings"))).data;
  assert.equal(settings.credentials.youtube.clientId, "old-yt-id");
  assert.equal(settings.canManageApps, true);
  assert.ok(settings.hashtagGroups.some((g) => g.name === "Ancien"));
  assert.ok(fs.existsSync(path.join(appDir, "data", "db.ancienne-version.php")));
  assert.ok(!fs.existsSync(path.join(appDir, "data", "db.php")));
});

test("connexion OAuth des trois plateformes", async () => {
  const put = await json(api("/settings"), {
    ...PUT,
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

test("publication photo : carrousel Instagram et photos TikTok ; YouTube refusé", { timeout: 60_000 }, async () => {
  const upload = async (bytes, width, height) => {
    const created = await json(api("/media"), { method: "POST", json: { fileName: "photo.jpg", size: bytes.length, mimeType: "image/jpeg" } });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    await call(api(`/media/${created.data.id}/chunk`, "&offset=0"), { method: "POST", body: bytes, headers: { "content-type": "application/octet-stream" } });
    const done = await json(api(`/media/${created.data.id}/complete`), { method: "POST", json: { width, height } });
    assert.equal(done.data.status, "ready");
    return created.data.id;
  };
  const photos = [crypto.randomBytes(40_000), crypto.randomBytes(55_000)];
  const ids = [await upload(photos[0], 1080, 1350), await upload(photos[1], 1080, 1080)];
  const base = (await json(api("/settings"))).data;
  assert.ok(base);
  const options = {
    youtube: { title: "", description: "", tags: [], sync: { title: true, description: true, tags: true }, categoryId: "22", privacy: "public", madeForKids: false, notifySubscribers: true, embeddable: true, license: "youtube", containsSyntheticMedia: false, defaultLanguage: "fr", format: "auto" },
    tiktok: { caption: "", sync: { caption: true }, mode: "direct", privacyLevel: "PUBLIC_TO_EVERYONE", allowComments: true, allowDuet: true, allowStitch: true, coverTimestampMs: 0, commercialContent: false, yourBrand: false, brandedContent: false, isAigc: false, autoAddMusic: true },
    instagram: { caption: "", sync: { caption: true }, shareToFeed: true, thumbOffsetMs: 0, collaborators: [], audioName: "", locationId: "" },
  };
  const input = (platforms, extra = {}) => ({ kind: "photo", imageIds: ids, common: { title: "Carrousel test", description: "Deux photos", hashtags: ["photo"] }, platforms, options, ...extra });

  const withYoutube = await json(api("/posts"), { method: "POST", json: { action: "publish", input: input(["youtube", "instagram"]) } });
  assert.equal(withYoutube.status, 422);
  assert.match(withYoutube.data.error, /YouTube n'accepte que des vidéos/);

  const post = await json(api("/posts"), { method: "POST", json: { action: "publish", input: input(["tiktok", "instagram"]) } });
  assert.equal(post.status, 200, JSON.stringify(post.data));
  assert.equal(post.data.images.length, 2);
  let current;
  for (let i = 0; i < 100; i++) {
    current = (await json(api(`/posts/${post.data.id}`))).data;
    if (current.status !== "publishing") break;
    await new Promise((r) => setTimeout(r, 300));
  }
  const pubs = current.publications;
  assert.equal(current.status, "published", JSON.stringify(Object.fromEntries(Object.entries(pubs).map(([k, v]) => [k, [v.status, v.error]]))));
  assert.equal(pubs.instagram.url, "https://www.instagram.com/p/PHOTO123/");
  assert.equal(pubs.tiktok.url, "https://www.tiktok.com/@createur.tt/photo/7300000000000000002");
  // Instagram : 2 éléments de carrousel téléchargés intacts, dans l'ordre.
  const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
  assert.deepEqual(mock.state.ig.images.map((x) => [x.status, x.hash, x.carouselItem]), [[200, sha(photos[0]), true], [200, sha(photos[1]), true]]);
  assert.deepEqual(mock.state.ig.carousel.children, ["child1", "child2"]);
  assert.equal(mock.state.ig.carousel.caption, "Carrousel test\n\nDeux photos\n\n#photo");
  // TikTok : mode photo, images récupérées depuis l'hébergement, titre et description séparés.
  const init = mock.state.tt.photoInit;
  assert.equal(init.media_type, "PHOTO");
  assert.equal(init.post_mode, "DIRECT_POST");
  assert.equal(init.source_info.source, "PULL_FROM_URL");
  assert.equal(init.post_info.title, "Carrousel test");
  assert.equal(init.post_info.description, "Deux photos\n\n#photo");
  assert.equal(init.post_info.auto_add_music, true);
  assert.deepEqual(mock.state.tt.photoDownloads.map((d) => [d.status, d.hash]), [[200, sha(photos[0])], [200, sha(photos[1])]]);

  // Format refusé par Instagram (trop vertical).
  const tall = await upload(crypto.randomBytes(10_000), 1080, 1920);
  const bad = await json(api("/posts"), { method: "POST", json: { action: "publish", input: input(["instagram"], { imageIds: [tall] }) } });
  assert.equal(bad.status, 422);
  assert.match(bad.data.error, /format refusé par Instagram/);
});

test("YouTube : Short demandé pour une vidéo horizontale refusé", async () => {
  const created = await json(api("/media"), { method: "POST", json: { fileName: "h.mp4", size: 1000, mimeType: "video/mp4" } });
  await call(api(`/media/${created.data.id}/chunk`, "&offset=0"), { method: "POST", body: crypto.randomBytes(1000), headers: { "content-type": "application/octet-stream" } });
  await json(api(`/media/${created.data.id}/complete`), { method: "POST", json: { duration: 30, width: 1920, height: 1080 } });
  const options = {
    youtube: { title: "Horizontal", description: "", tags: [], sync: { title: false, description: true, tags: true }, categoryId: "22", privacy: "public", madeForKids: false, notifySubscribers: true, embeddable: true, license: "youtube", containsSyntheticMedia: false, defaultLanguage: "fr", format: "short" },
    tiktok: { caption: "", sync: { caption: true }, mode: "direct", privacyLevel: "", allowComments: true, allowDuet: true, allowStitch: true, coverTimestampMs: 0, commercialContent: false, yourBrand: false, brandedContent: false, isAigc: false },
    instagram: { caption: "", sync: { caption: true }, shareToFeed: true, thumbOffsetMs: 0, collaborators: [], audioName: "", locationId: "" },
  };
  const r = await json(api("/posts"), { method: "POST", json: { action: "publish", input: { mediaId: created.data.id, common: { title: "Horizontal", description: "", hashtags: [] }, platforms: ["youtube"], options } } });
  assert.equal(r.status, 422);
  assert.match(r.data.error, /Un Short doit être vertical/);
  // Brouillon : accepté tel quel.
  const draft = await json(api("/posts"), { method: "POST", json: { action: "draft", input: { mediaId: created.data.id, common: { title: "Horizontal", description: "", hashtags: [] }, platforms: ["youtube"], options } } });
  assert.equal(draft.status, 200);
  assert.equal(draft.data.options.youtube.format, "short");
});

test("annonces Discord : webhooks, message de test, liens envoyés à la publication", { timeout: 90_000 }, async () => {
  const hookUrl = (id, token) => `https://discord.com/api/webhooks/${id}/${token}`;
  const create = (body) => json(api("/discord/webhooks"), { method: "POST", json: { message: "", mention: "none", style: "links", timing: "each", enabled: true, ...body } });

  // Seules les adresses de webhook Discord sont acceptées.
  for (const url of ["https://evil.example.com/api/webhooks/123456/abcdefghijklmnopqrstuvwxyz", "http://discord.com/api/webhooks/123456/abcdefghijklmnopqrstuvwxyz", "https://discord.com.evil.fr/api/webhooks/123456/abcdefghijklmnopqrstuvwxyz"]) {
    const bad = await create({ name: "Pirate", url, platforms: ["youtube"] });
    assert.equal(bad.status, 422, url);
  }
  assert.equal((await create({ name: "Sans plateforme", url: hookUrl("123456", "abcdefghijklmnopqrstuvwxyz"), platforms: [] })).status, 422);
  assert.equal((await create({ name: "Rôle", url: hookUrl("123456", "abcdefghijklmnopqrstuvwxyz"), platforms: ["youtube"], mention: "role", roleId: "abc" })).status, 422);

  const each = await create({ name: "Annonces", url: hookUrl("111111111111", "tokenAAAAAAAAAAAAAAAAAAAAAA"), platforms: ["tiktok", "youtube", "instagram"], mention: "role", roleId: "222222222222" });
  assert.equal(each.status, 201, JSON.stringify(each.data));
  assert.equal(each.data.urlHint, "discord.com/api/webhooks/1111…1111/••••••");
  assert.ok(!("url" in each.data), "adresse complète jamais renvoyée");
  const grouped = (await create({ name: "Récap", url: hookUrl("333333333333", "tokenBBBBBBBBBBBBBBBBBBBBBB"), platforms: ["youtube", "tiktok"], timing: "grouped", style: "card", mention: "everyone", username: "Malabop" })).data;
  const off = (await create({ name: "Désactivé", url: hookUrl("444444444444", "tokenCCCCCCCCCCCCCCCCCCCCCC"), platforms: ["youtube"], enabled: false })).data;
  const gone = (await create({ name: "Supprimé", url: hookUrl("555555555555", "goneDDDDDDDDDDDDDDDDDDDDDD"), platforms: ["instagram"] })).data;
  const list = (await json(api("/discord/webhooks"))).data;
  assert.deepEqual(list.map((h) => h.name), ["Annonces", "Récap", "Désactivé", "Supprimé"]);
  assert.ok(!JSON.stringify(list).includes("tokenAAAA"), "jeton du webhook jamais renvoyé");

  // Message de test (avec une limite de débit Discord à patienter).
  mock.state.discord.failNext = 1;
  assert.equal((await json(api(`/discord/webhooks/${each.data.id}/test`), { method: "POST" })).status, 200);
  const testMsg = mock.state.discord.messages.at(-1);
  assert.equal(testMsg.id, "111111111111");
  assert.equal(testMsg.wait, "true");
  assert.match(testMsg.payload.content, /^<@&222222222222> 🎬 \*\*Message de test VideoPosting\*\* est en ligne !/);
  assert.match(testMsg.payload.content, /▶️ YouTube : https:\/\/www\.youtube\.com\//);
  assert.deepEqual(testMsg.payload.allowed_mentions, { parse: [], roles: ["222222222222"] });
  const failed = await json(api(`/discord/webhooks/${gone.id}/test`), { method: "POST" });
  assert.equal(failed.status, 502);
  assert.match(failed.data.error, /invalide ou supprimé/);
  const afterTest = (await json(api("/discord/webhooks"))).data;
  assert.equal(afterTest.find((h) => h.id === each.data.id).lastResult.ok, true);
  assert.equal(afterTest.find((h) => h.id === gone.id).lastResult.ok, false);

  // Modification sans renvoyer l'adresse : elle est conservée.
  const renamed = await json(api(`/discord/webhooks/${off.id}`), { ...PUT, json: { ...off, name: "En pause", url: "" } });
  assert.equal(renamed.status, 200, JSON.stringify(renamed.data));
  assert.equal(renamed.data.name, "En pause");
  assert.equal(renamed.data.urlHint, off.urlHint);

  // Publication réelle sur les trois plateformes : liens annoncés automatiquement.
  const created = await json(api("/media"), { method: "POST", json: { fileName: "d.mp4", size: 2000, mimeType: "video/mp4" } });
  await call(api(`/media/${created.data.id}/chunk`, "&offset=0"), { method: "POST", body: crypto.randomBytes(2000), headers: { "content-type": "application/octet-stream" } });
  await json(api(`/media/${created.data.id}/complete`), { method: "POST", json: { duration: 15, width: 1080, height: 1920 } });
  const options = {
    youtube: { title: "", description: "", tags: [], sync: { title: true, description: true, tags: true }, categoryId: "22", privacy: "public", madeForKids: false, notifySubscribers: true, embeddable: true, license: "youtube", containsSyntheticMedia: false, defaultLanguage: "fr", format: "auto" },
    tiktok: { caption: "", sync: { caption: true }, mode: "direct", privacyLevel: "PUBLIC_TO_EVERYONE", allowComments: true, allowDuet: true, allowStitch: true, coverTimestampMs: 0, commercialContent: false, yourBrand: false, brandedContent: false, isAigc: false, autoAddMusic: true },
    instagram: { caption: "", sync: { caption: true }, shareToFeed: true, thumbOffsetMs: 0, collaborators: [], audioName: "", locationId: "" },
  };
  const publish = async (platforms, extra = {}) => {
    const post = await json(api("/posts"), {
      method: "POST",
      json: { action: "publish", input: { mediaId: created.data.id, common: { title: "Annonce Discord", description: "Nouvelle vidéo", hashtags: [] }, platforms, options, ...extra } },
    });
    assert.equal(post.status, 200, JSON.stringify(post.data));
    let current;
    for (let i = 0; i < 200; i++) {
      current = (await json(api(`/posts/${post.data.id}`))).data;
      if (current.status !== "publishing") break;
      await new Promise((r) => setTimeout(r, 300));
    }
    assert.equal(current.status, "published", JSON.stringify(Object.fromEntries(Object.entries(current.publications).map(([k, v]) => [k, [v.status, v.error]]))));
    // Les annonces partent juste après la dernière étape : on laisse le worker terminer.
    await new Promise((r) => setTimeout(r, 800));
    return (await json(api(`/posts/${post.data.id}`))).data;
  };
  const before = mock.state.discord.messages.length;
  const post = await publish(["tiktok", "youtube", "instagram"]);
  const sent = mock.state.discord.messages.slice(before);
  const urls = { tiktok: post.publications.tiktok.url, youtube: post.publications.youtube.url, instagram: post.publications.instagram.url };

  // « Annonces » : un message par plateforme, dès qu'elle est en ligne, avec la mention du rôle.
  const eachMsgs = sent.filter((m) => m.id === "111111111111");
  assert.equal(eachMsgs.length, 3);
  for (const [platform, url] of Object.entries(urls)) {
    const msg = eachMsgs.find((m) => m.payload.content.includes(url));
    assert.ok(msg, `lien ${platform} annoncé`);
    assert.match(msg.payload.content, /^<@&222222222222> 🎬 \*\*Annonce Discord\*\* est en ligne !\n/);
    assert.equal(msg.payload.username, "VideoPosting");
    assert.equal(msg.payload.embeds, undefined);
  }
  // « Récap » : un seul message une fois tout publié, en carte, limité à YouTube et TikTok.
  const groupedMsgs = sent.filter((m) => m.id === "333333333333");
  assert.equal(groupedMsgs.length, 1);
  const card = groupedMsgs[0].payload;
  assert.equal(card.username, "Malabop");
  assert.match(card.content, /^@everyone /);
  assert.ok(card.content.includes(`<${urls.youtube}>`), "liens entre chevrons en style carte");
  assert.ok(!card.content.includes(urls.instagram));
  assert.deepEqual(card.allowed_mentions, { parse: ["everyone"] });
  assert.equal(card.embeds[0].title, "Annonce Discord");
  assert.deepEqual(card.embeds[0].fields.map((f) => f.name).sort(), ["▶️ YouTube", "🎵 TikTok"]);
  assert.equal(card.embeds[0].thumbnail.url, "https://i.ytimg.com/vi/vid123/hqdefault.jpg");
  // Désactivé : rien. Supprimé chez Discord : échec noté dans le journal, la publication reste réussie.
  assert.ok(!sent.some((m) => m.id === "444444444444"));
  assert.ok(post.publications.instagram.logs.some((l) => l.level === "warn" && /Discord \(« Supprimé »\) : Webhook Discord invalide/.test(l.message)));
  assert.ok(post.publications.youtube.logs.some((l) => l.message === "Annonce Discord envoyée dans « Récap »"));

  // Choix par publication : seul « Récap » est prévenu.
  const before2 = mock.state.discord.messages.length;
  const second = await publish(["tiktok"], { discordWebhookIds: [grouped.id, "pas-un-uuid"] });
  assert.deepEqual(second.discordWebhookIds, [grouped.id]);
  const sent2 = mock.state.discord.messages.slice(before2);
  assert.deepEqual(sent2.map((m) => m.id), ["333333333333"]);
  assert.deepEqual(sent2[0].payload.embeds[0].fields.map((f) => f.name), ["🎵 TikTok"]);
  const dup = await json(api(`/posts/${second.id}/duplicate`), { method: "POST" });
  assert.deepEqual(dup.data.discordWebhookIds, [grouped.id]);

  // Nettoyage : ces publications ne doivent pas fausser les statistiques suivantes.
  for (const id of [post.id, second.id, dup.data.id]) await json(api(`/posts/${id}`), DELETE);
  for (const h of [off, gone]) assert.equal((await json(api(`/discord/webhooks/${h.id}`), DELETE)).status, 200);
  assert.deepEqual((await json(api("/discord/webhooks"))).data.map((h) => h.name), ["Annonces", "Récap"]);
});

test("pages légales : informations publiques, modifiables par l'administrateur", async () => {
  const anonymous = browser();
  const initial = await anonymous.json(api("/legal"));
  assert.equal(initial.status, 200, "accessible sans connexion (vérifié par TikTok, Meta et Google)");
  assert.deepEqual(initial.data, { serviceName: "VideoPosting", editor: "", email: "" });

  assert.equal((await json(api("/settings"), { ...PUT, json: { legal: { email: "pas-un-email" } } })).status, 422);
  const saved = await json(api("/settings"), { ...PUT, json: { legal: { serviceName: "VideoPosting Malabop", editor: "Malabop", email: "contact@malabop.fr" } } });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  assert.deepEqual(saved.data.legal, { serviceName: "VideoPosting Malabop", editor: "Malabop", email: "contact@malabop.fr" });
  assert.deepEqual((await anonymous.json(api("/legal"))).data, saved.data.legal);
  // Nom vide : retour au nom par défaut ; champs non envoyés conservés.
  const reset = await json(api("/settings"), { ...PUT, json: { legal: { serviceName: "" } } });
  assert.deepEqual(reset.data.legal, { serviceName: "VideoPosting", editor: "Malabop", email: "contact@malabop.fr" });
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

  // Taux d'influence : partages et abonnés gagnés YouTube (Analytics), portée Instagram.
  const top = a.topPosts[0].platforms;
  assert.equal(top.youtube.shares, 25);
  assert.equal(top.youtube.followersGained, 7);
  assert.equal(top.instagram.reach, 700);
  assert.equal(top.instagram.saves, 11);
  assert.match(mock.state.yt.videoFilter, /^video==vid123$/);

  // Audience : genre, âge et pays (YouTube Analytics, Instagram Insights).
  const yt = a.audience.youtube;
  assert.equal(yt.source, "api");
  assert.equal(yt.basis, "viewers");
  assert.ok(Math.abs(yt.gender.female - 0.55) < 1e-9 && Math.abs(yt.gender.other - 0.05) < 1e-9);
  assert.ok(Math.abs(yt.ages["25-34"] - 0.5) < 1e-9);
  assert.deepEqual(yt.countries.map((c) => c.code), ["FR", "BE", "CA"]);
  assert.ok(Math.abs(yt.countries[0].share - 0.6) < 1e-9);
  const ig = a.audience.instagram;
  assert.equal(ig.basis, "followers");
  assert.ok(Math.abs(ig.gender.female - 2000 / 3200) < 1e-9);
  assert.ok(Math.abs(ig.ages["25-34"] - 0.5) < 1e-9);
  assert.equal(ig.countries[0].code, "FR");
  assert.equal(ig.cities[0].name, "Paris");
  assert.equal(a.audience.tiktok, undefined, "TikTok ne fournit pas d'audience par API");
});

test("chaîne Twitch : abonnés, abonnements, bits et revenus estimés", async () => {
  const start = await call(api("/auth/twitch-channel/connect"));
  assert.equal(start.status, 302);
  const authorize = new URL(start.headers.get("location"));
  assert.equal(authorize.origin + authorize.pathname, "https://id.twitch.tv/oauth2/authorize");
  assert.match(authorize.searchParams.get("scope"), /channel:read:subscriptions/);
  assert.match(authorize.searchParams.get("scope"), /bits:read/);
  const state = authorize.searchParams.get("state");
  assert.ok(state.startsWith("twitchch."));
  const back = await call(`${BASE}/api/callback.php?code=code-malabop&state=${encodeURIComponent(state)}`);
  assert.equal(back.headers.get("location"), `${BASE}/accounts/?connected=twitch`);

  const info = (await json(api("/twitch-channel"))).data;
  assert.equal(info.connected, true);
  assert.equal(info.login, "malabop");
  assert.equal(info.followers, 4321);
  assert.deepEqual(info.subscriptions, { total: 5, tier1: 2, tier2: 1, tier3: 1, points: 11 }, "le propre abonnement du créateur n'est pas compté");
  assert.equal(info.bitsThisMonth, 1500);
  assert.equal(info.monthlyEstimate, (2 + 2 + 5) * 2.5 + 15);

  const month = new Date().toISOString().slice(0, 7);
  let revenue = (await json(api("/revenue"))).data;
  const subs = revenue.entries.find((e) => e.id === `est-twitch-subs-${month}`);
  const bits = revenue.entries.find((e) => e.id === `est-twitch-bits-${month}`);
  assert.equal(subs.amount, 22.5);
  assert.equal(subs.platform, "twitch");
  assert.equal(subs.estimated, true);
  assert.equal(bits.amount, 15);
  assert.ok(revenue.estimatedIncome >= 37.5);
  assert.ok(revenue.byPlatform.some((p) => p.platform === "twitch"));

  // Réglages : valeur d'un abonnement, puis estimations désactivées.
  const s = await json(api("/settings"), { ...PUT, json: { revenueEstimates: { twitchSubValue: 3 } } });
  assert.equal(s.data.revenueEstimates.twitchSubValue, 3);
  assert.equal(s.data.twitchAvailable, true);
  revenue = (await json(api("/revenue"))).data;
  assert.equal(revenue.entries.find((e) => e.id === `est-twitch-subs-${month}`).amount, 27);
  await json(api("/settings"), { ...PUT, json: { revenueEstimates: { enabled: false } } });
  revenue = (await json(api("/revenue"))).data;
  assert.ok(!revenue.entries.some((e) => e.estimated));
  await json(api("/settings"), { ...PUT, json: { revenueEstimates: { enabled: true, twitchSubValue: 2.5 } } });

  assert.equal((await json(api("/twitch-channel"), DELETE)).status, 200);
  assert.equal((await json(api("/twitch-channel"))).data.connected, false);
  assert.ok(mock.state.twitch.revoked.includes("tw-malabop"));
});

test("audience TikTok saisie à la main", async () => {
  const bad = await json(api("/analytics/audience/tiktok"), { ...PUT, json: {} });
  assert.equal(bad.status, 422);
  const saved = await json(api("/analytics/audience/tiktok"), {
    ...PUT,
    json: { gender: { female: 60, male: 38, other: 2 }, ages: { "18-24": 50, "25-34": 30, "13-17": 20 }, countries: [{ code: "fr", share: 70 }, { code: "BE", share: 10 }, { code: "XXX", share: 5 }] },
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.data));
  const a = (await json(api("/analytics", "&range=28"))).data;
  const tt = a.audience.tiktok;
  assert.equal(tt.source, "manual");
  assert.ok(Math.abs(tt.gender.female - 0.6) < 1e-9);
  assert.deepEqual(Object.keys(tt.ages), ["13-17", "18-24", "25-34"]);
  assert.deepEqual(tt.countries, [{ code: "FR", share: 0.7 }, { code: "BE", share: 0.1 }]);
  assert.equal((await json(api("/analytics/audience/tiktok"), DELETE)).status, 200);
  assert.equal((await json(api("/analytics", "&range=28"))).data.audience.tiktok, undefined);
  assert.equal((await json(api("/analytics/audience/snapchat"), { ...PUT, json: {} })).status, 404);
});

test("espaces séparés : accès sur invitation, données isolées, droits limités", async () => {
  const guest = browser();
  // Mode par défaut « propriétaire » : personne d'autre n'entre.
  assert.match(decodeURIComponent(await guest.twitchLogin("invite")), /\/login\/\?error=Votre compte Twitch n'a pas accès/);
  assert.equal((await guest.json(api("/posts"))).status, 401);

  assert.equal((await guest.json(api("/admin"))).status, 401);
  const access = await json(api("/admin/access"), { ...PUT, json: { mode: "invite", allowed: ["@Invite", "autre_pseudo"] } });
  assert.equal(access.status, 200);
  assert.deepEqual(access.data.access, { mode: "invite", allowed: ["invite", "autre_pseudo"] });

  assert.equal(await guest.twitchLogin("invite"), `${BASE}/`);
  const session = (await guest.json(api("/session"))).data;
  assert.equal(session.user.role, "member");
  // Espace vierge : aucune donnée de l'administrateur.
  assert.deepEqual((await guest.json(api("/posts"))).data, []);
  assert.deepEqual((await guest.json(api("/accounts"))).data, []);
  const settings = (await guest.json(api("/settings"))).data;
  assert.equal(settings.canManageApps, false);
  assert.equal(settings.demoMode, true);
  assert.equal(settings.cronUrl, null);
  assert.equal(settings.credentials.youtube.clientId, "", "identifiants des applications masqués");
  assert.equal(settings.credentials.youtube.configured, true, "mais l'application est utilisable");
  // Les applications développeur restent réservées à l'administrateur.
  const forbidden = await guest.json(api("/settings"), { ...PUT, json: { credentials: { youtube: { clientId: "pirate" } } } });
  assert.equal(forbidden.status, 403);
  assert.equal((await guest.json(api("/admin"))).status, 403);
  assert.equal((await guest.json(api("/admin/access"), { ...PUT, json: { mode: "open" } })).status, 403);
  // Pages légales : communes à l'installation, visibles mais non modifiables par un membre.
  assert.equal(settings.legal.email, "contact@malabop.fr");
  assert.equal((await guest.json(api("/settings"), { ...PUT, json: { legal: { editor: "Pirate" } } })).status, 403);
  // Réglages personnels et comptes propres à l'espace.
  assert.equal((await guest.json(api("/settings"), { ...PUT, json: { currency: "USD" } })).status, 200);
  const connect = await guest.call(api("/auth/youtube/connect"));
  assert.equal(connect.headers.get("location"), `${BASE}/accounts/?connected=youtube`);
  assert.equal((await guest.json(api("/accounts"))).data[0].demo, true);
  const draft = await guest.json(api("/posts"), {
    method: "POST",
    json: { action: "draft", input: { mediaId: null, common: { title: "Brouillon invité", description: "", hashtags: [] }, platforms: ["youtube"], options: {} } },
  });
  assert.equal(draft.status, 200, JSON.stringify(draft.data));
  assert.equal((await guest.json(api(`/posts/${draft.data.id}`))).status, 200);
  // L'administrateur ne voit pas les publications de l'invité dans son propre espace, ni l'inverse.
  assert.equal((await json(api(`/posts/${draft.data.id}`))).status, 404);
  assert.ok(!(await json(api("/posts"))).data.some((p) => p.id === draft.data.id));
  assert.equal((await json(api("/settings"))).data.currency, "EUR");
  assert.equal((await json(api("/accounts"))).data.length, 3);

  // Vue d'ensemble de l'administrateur.
  const overview = (await json(api("/admin"))).data;
  const ownerPosts = (await json(api("/posts"))).data.length;
  assert.deepEqual(overview.users.map((u) => [u.login, u.role, u.posts]).sort(), [["invite", "member", 1], ["malabop", "admin", ownerPosts]]);
  assert.equal(overview.twitch.clientId, "tw-client");

  // Retrait de l'invitation : la session de l'invité ne fonctionne plus.
  await json(api("/admin/access"), { ...PUT, json: { mode: "invite", allowed: [] } });
  assert.equal((await guest.json(api("/posts"))).status, 401);
  // Mode ouvert : tout compte Twitch peut créer son espace.
  await json(api("/admin/access"), { ...PUT, json: { mode: "open", allowed: [] } });
  assert.equal((await guest.json(api("/posts"))).status, 200);
  const third = browser();
  assert.equal(await third.twitchLogin("troisieme"), `${BASE}/`);
  assert.deepEqual((await third.json(api("/posts"))).data, []);

  // Suppression d'un espace par l'administrateur.
  const guestId = session.user.id;
  assert.ok(fs.existsSync(path.join(appDir, "data", "spaces", guestId, "db.php")));
  const me = (await json(api("/session"))).data.user;
  assert.equal((await json(api(`/admin/users/${me.id}`), DELETE)).status, 409);
  assert.equal((await json(api(`/admin/users/${me.id}`), { ...PUT, json: { role: "member" } })).status, 409);
  const removed = await json(api(`/admin/users/${guestId}`), DELETE);
  assert.equal(removed.status, 200);
  assert.ok(!removed.data.users.some((u) => u.id === guestId));
  assert.ok(!fs.existsSync(path.join(appDir, "data", "spaces", guestId)));
  assert.equal((await guest.json(api("/posts"))).status, 401);
  // Promotion : un second administrateur peut gérer les applications.
  const promoted = await json(api(`/admin/users/${(await third.json(api("/session"))).data.user.id}`), { ...PUT, json: { role: "admin" } });
  assert.equal(promoted.status, 200);
  assert.equal((await third.json(api("/settings"))).data.canManageApps, true);
});

test("cron, déconnexion et réinitialisation de l'installation", async () => {
  const { cronUrl } = (await json(api("/settings"))).data;
  assert.ok(cronUrl.startsWith(`${BASE}/api/index.php?r=%2Fcron&secret=`));
  assert.equal((await fetch(cronUrl.replace(/secret=.*/, "secret=faux"))).status, 401);
  const cron = await fetch(cronUrl);
  assert.equal(cron.status, 200);
  assert.equal((await cron.json()).ok, true);

  // Fichiers de données jamais lisibles depuis le navigateur (garde PHP en tête de fichier).
  const raw = fs.readFileSync(path.join(appDir, "data", "app.php"), "utf8");
  assert.ok(raw.startsWith("<?php exit; ?>"));

  const logout = await json(api("/session"), DELETE);
  assert.equal(logout.status, 200);
  assert.equal((await json(api("/posts"))).status, 401);
  assert.equal(await owner.twitchLogin("malabop"), `${BASE}/`);
  assert.equal((await json(api("/posts"))).status, 200);

  // Accès perdu (changement de compte, application Twitch supprimée…) : fichier data/reset-setup.
  fs.writeFileSync(path.join(appDir, "data", "reset-setup"), "");
  assert.equal((await json(api("/session"))).data.setupRequired, true);
  assert.equal((await json(api("/posts"))).status, 401);
  // Application Twitch déjà enregistrée : seul le code d'installation est redemandé.
  const again = await json(api("/session/setup"), { method: "POST", json: { setupCode: "TEST-CODE-0000" } });
  assert.equal(again.status, 200);
  assert.equal(await owner.twitchLogin("malabop", again.data.redirect), `${BASE}/`);
  assert.ok(!fs.existsSync(path.join(appDir, "data", "reset-setup")));
  const posts = (await json(api("/posts"))).data;
  assert.ok(posts.some((p) => p.id === "legacy-post"), "données conservées");
});

test("fichier .env hors du dossier public : prioritaire, jamais exposé", async () => {
  const outside = path.join(path.dirname(docroot), ".env");
  fs.writeFileSync(
    outside,
    ["# identifiants", "TWITCH_CLIENT_ID=tw-client", "TWITCH_CLIENT_SECRET='tw-secret'", 'YOUTUBE_CLIENT_ID="env-yt-id"', "YOUTUBE_CLIENT_SECRET=env-yt-secret # commentaire", "TIKTOK_CLIENT_KEY="].join("\n"),
  );
  try {
    const s = (await json(api("/settings"))).data;
    assert.equal(s.credentials.youtube.clientId, "env-yt-id");
    assert.equal(s.credentials.youtube.fromEnv, true);
    assert.equal(s.credentials.tiktok.fromEnv, false, "valeur vide ignorée");
    assert.deepEqual(s.env, { found: true, location: "outside", public: false, keys: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"] });
    assert.ok(!JSON.stringify(s).includes("env-yt-secret"), "secret jamais renvoyé");
    const overview = (await json(api("/admin"))).data;
    assert.equal(overview.twitch.fromEnv, true);
    assert.equal((await json(api("/admin/twitch"), { ...PUT, json: { clientId: "x", clientSecret: "y" } })).status, 409);
    assert.equal((await json(api("/session"))).data.twitchFromEnv, true);
    // Le YouTube du .env est bien celui utilisé pour la connexion.
    const connect = await call(api("/auth/youtube/connect"));
    assert.equal(new URL(connect.headers.get("location")).searchParams.get("client_id"), "env-yt-id");

    // Un .env oublié dans le dossier public est signalé.
    fs.renameSync(outside, path.join(docroot, ".env"));
    assert.equal((await json(api("/settings"))).data.env.public, true);
    // Dans le dossier protégé posting/data : accepté.
    fs.renameSync(path.join(docroot, ".env"), path.join(appDir, "data", ".env"));
    const inData = (await json(api("/settings"))).data.env;
    assert.equal(inData.location, "data");
    assert.equal(inData.public, false);
  } finally {
    for (const f of [outside, path.join(docroot, ".env"), path.join(appDir, "data", ".env")]) fs.rmSync(f, { force: true });
  }
  assert.equal((await json(api("/settings"))).data.env.found, false);
});
