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
  docroot = fs.mkdtempSync(path.join(os.tmpdir(), "vp-php-"));
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
  fs.rmSync(docroot, { recursive: true, force: true });
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
  assert.deepEqual(overview.users.map((u) => [u.login, u.role, u.posts]).sort(), [["invite", "member", 1], ["malabop", "admin", 2]]);
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
