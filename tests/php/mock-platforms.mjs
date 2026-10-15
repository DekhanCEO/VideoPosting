// Faux serveur imitant les API Twitch, Google/YouTube, TikTok et Instagram (tests d'intégration).
import crypto from "node:crypto";
import http from "node:http";

export function startMock(port) {
  const state = {
    yt: { sessions: new Map(), failedOnce: false, hash: null, meta: null },
    tt: { bytes: [], init: null, statusCalls: 0, hash: null },
    ig: { container: null, downloaded: null, hash: null, published: false, statusCalls: 0 },
    twitch: { tokenCalls: [], revoked: [] },
    log: [],
  };
  const base = `http://127.0.0.1:${port}`;

  const readBody = (req) =>
    new Promise((resolve) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks)));
    });
  const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { "Content-Type": "application/json", ...headers });
    res.end(body === undefined ? "" : JSON.stringify(body));
  };
  const tt = (data) => ({ data, error: { code: "ok", message: "" } });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, base);
    const p = url.pathname;
    const body = await readBody(req);
    state.log.push(`${req.method} ${p}`);
    const form = () => Object.fromEntries(new URLSearchParams(body.toString()));

    // ---- Twitch (connexion à VideoPosting) ----
    // Le code d'autorisation désigne l'utilisateur : « code-<login> » → jeton « tw-<login> ».
    if (p === "/id.twitch.tv/oauth2/token") {
      const f = form();
      state.twitch.tokenCalls.push(f);
      if (f.client_secret !== "tw-secret") return send(res, 403, { status: 403, message: "invalid client secret" });
      if (f.grant_type === "client_credentials") return send(res, 200, { access_token: "tw-app", expires_in: 5000000, token_type: "bearer" });
      if (f.grant_type === "authorization_code" && f.code?.startsWith("code-")) {
        return send(res, 200, { access_token: `tw-${f.code.slice(5)}`, refresh_token: "r", expires_in: 14000, scope: ["user:read:email"], token_type: "bearer" });
      }
      return send(res, 400, { status: 400, message: "Invalid authorization code" });
    }
    if (p === "/id.twitch.tv/oauth2/revoke") {
      state.twitch.revoked.push(form().token);
      return send(res, 200);
    }
    if (p === "/api.twitch.tv/helix/users") {
      const token = (req.headers.authorization ?? "").replace("Bearer ", "");
      if (!token.startsWith("tw-") || req.headers["client-id"] !== "tw-client") return send(res, 401, { status: 401, message: "Invalid OAuth token" });
      const login = token.slice(3);
      const id = String(1000 + [...login].reduce((n, ch) => n + ch.charCodeAt(0), 0));
      return send(res, 200, { data: [{ id, login, display_name: login[0].toUpperCase() + login.slice(1), profile_image_url: `https://static-cdn.jtvnw.net/${login}.png`, email: `${login}@example.com` }] });
    }

    // ---- Google / YouTube ----
    if (p === "/oauth2.googleapis.com/token") return send(res, 200, { access_token: "yt-access", refresh_token: "yt-refresh", expires_in: 3600, scope: "a b" });
    if (p === "/www.googleapis.com/youtube/v3/channels") {
      if (url.searchParams.get("part") === "statistics") return send(res, 200, { items: [{ statistics: { subscriberCount: "1234", viewCount: "99999", videoCount: "12" } }] });
      return send(res, 200, { items: [{ id: "UC123", snippet: { title: "Ma chaîne", customUrl: "@machaine", thumbnails: { default: { url: "https://x/y.jpg" } } } }] });
    }
    if (p === "/www.googleapis.com/upload/youtube/v3/videos") {
      state.yt.meta = JSON.parse(body.toString());
      const id = crypto.randomUUID();
      state.yt.sessions.set(id, { total: Number(req.headers["x-upload-content-length"]), parts: [] });
      return send(res, 200, {}, { Location: `${base}/upload/yt/${id}` });
    }
    if (p.startsWith("/upload/yt/")) {
      const s = state.yt.sessions.get(p.split("/").pop());
      const range = req.headers["content-range"];
      const received = s.parts.reduce((n, b) => n + b.length, 0);
      if (range?.startsWith("bytes */")) {
        return received >= s.total ? send(res, 201, { id: "vid123" }) : send(res, 308, undefined, received ? { Range: `bytes=0-${received - 1}` } : {});
      }
      const [, start] = range.match(/bytes (\d+)-(\d+)\/(\d+)/);
      // Panne simulée sur le 2e morceau pour tester la reprise.
      if (Number(start) > 0 && !state.yt.failedOnce) {
        state.yt.failedOnce = true;
        return send(res, 503, { error: { message: "backend error" } });
      }
      if (Number(start) !== received) return send(res, 308, undefined, { Range: `bytes=0-${received - 1}` });
      s.parts.push(body);
      const now = received + body.length;
      if (now >= s.total) {
        state.yt.hash = crypto.createHash("sha256").update(Buffer.concat(s.parts)).digest("hex");
        return send(res, 201, { id: "vid123", status: { uploadStatus: "uploaded" } });
      }
      return send(res, 308, undefined, { Range: `bytes=0-${now - 1}` });
    }
    if (p === "/www.googleapis.com/youtube/v3/videos") return send(res, 200, { items: [{ id: "vid123", statistics: { viewCount: "500", likeCount: "40", commentCount: "3" } }] });
    if (p === "/youtubeanalytics.googleapis.com/v2/reports") {
      const metrics = url.searchParams.get("metrics");
      const dimensions = url.searchParams.get("dimensions");
      if (dimensions === "video") {
        state.yt.videoFilter = url.searchParams.get("filters");
        return send(res, 200, { rows: [["vid123", 25, 7]] });
      }
      if (dimensions === "ageGroup,gender") {
        return send(res, 200, { rows: [["age18-24", "female", 30], ["age18-24", "male", 20], ["age25-34", "female", 25], ["age25-34", "male", 20], ["age25-34", "user_specified", 5]] });
      }
      if (dimensions === "country") return send(res, 200, { rows: [["FR", 600], ["BE", 200], ["CA", 200]] });
      if (metrics === "estimatedRevenue") return send(res, 200, { rows: [[new Date().toISOString().slice(0, 10), 12.5]] });
      return send(res, 200, { rows: [[new Date().toISOString().slice(0, 10), 800, 1200, 10, 2]] });
    }

    // ---- TikTok ----
    if (p === "/open.tiktokapis.com/v2/oauth/token/") return send(res, 200, { access_token: "tt-access", refresh_token: "tt-refresh", open_id: "open123", expires_in: 86400, refresh_expires_in: 31536000, scope: "user.info.basic,user.info.profile,video.publish" });
    if (p === "/open.tiktokapis.com/v2/user/info/") {
      if (url.searchParams.get("fields")?.includes("follower_count")) return send(res, 200, tt({ user: { follower_count: 5000, likes_count: 70000, video_count: 40 } }));
      return send(res, 200, tt({ user: { display_name: "Créateur TT", avatar_url: "https://x/a.jpg", username: "createur.tt" } }));
    }
    if (p === "/open.tiktokapis.com/v2/post/publish/creator_info/query/") {
      return send(res, 200, tt({ creator_username: "createur.tt", creator_nickname: "Créateur TT", privacy_level_options: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"], comment_disabled: false, duet_disabled: true, stitch_disabled: false, max_video_post_duration_sec: 600 }));
    }
    if (p === "/open.tiktokapis.com/v2/post/publish/video/init/") {
      state.tt.init = JSON.parse(body.toString());
      return send(res, 200, tt({ publish_id: "v_pub_file~1", upload_url: `${base}/upload/tt/1` }));
    }
    if (p === "/upload/tt/1") {
      const [, start, end, total] = req.headers["content-range"].match(/bytes (\d+)-(\d+)\/(\d+)/).map(Number);
      const received = state.tt.bytes.reduce((n, b) => n + b.length, 0);
      if (start !== received || body.length !== end - start + 1) return send(res, 400, { error: "bad range" });
      state.tt.bytes.push(body);
      if (end + 1 >= total) {
        state.tt.hash = crypto.createHash("sha256").update(Buffer.concat(state.tt.bytes)).digest("hex");
        return send(res, 201, {});
      }
      return send(res, 206, {});
    }
    if (p === "/open.tiktokapis.com/v2/post/publish/status/fetch/") {
      state.tt.statusCalls++;
      if (state.tt.statusCalls < 2) return send(res, 200, tt({ status: "PROCESSING_UPLOAD" }));
      // Entier 64 bits brut, comme l'API réelle (non représentable exactement en JavaScript).
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end('{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[7300000000000000001]},"error":{"code":"ok","message":""}}');
    }
    if (p === "/open.tiktokapis.com/v2/video/query/") return send(res, 200, tt({ videos: [{ id: "7300000000000000001", view_count: 1500, like_count: 200, comment_count: 12, share_count: 30 }] }));

    // ---- Instagram ----
    if (p === "/api.instagram.com/oauth/access_token") return send(res, 200, { access_token: "ig-short", user_id: 178 });
    if (p === "/graph.instagram.com/access_token") return send(res, 200, { access_token: "ig-long", token_type: "bearer", expires_in: 5184000 });
    const ig = p.match(/^\/graph\.instagram\.com\/v[\d.]+\/(.+)$/);
    if (ig) {
      const rest = ig[1];
      if (rest === "me") return send(res, 200, { id: "app-scoped", user_id: "17841400000", username: "createur.ig", name: "Créateur IG", account_type: "MEDIA_CREATOR" });
      if (rest === "17841400000/media" && req.method === "POST") {
        const f = form();
        state.ig.container = f;
        // Instagram télécharge la vidéo depuis l'URL signée fournie par l'hébergement.
        fetch(f.video_url)
          .then(async (r) => {
            const buf = Buffer.from(await r.arrayBuffer());
            state.ig.downloaded = r.status;
            state.ig.hash = crypto.createHash("sha256").update(buf).digest("hex");
          })
          .catch((e) => (state.ig.downloaded = String(e)));
        return send(res, 200, { id: "container1" });
      }
      if (rest === "container1") {
        state.ig.statusCalls++;
        return send(res, 200, { status_code: state.ig.hash && state.ig.statusCalls > 1 ? "FINISHED" : "IN_PROGRESS" });
      }
      if (rest === "17841400000/media_publish") {
        state.ig.published = true;
        return send(res, 200, { id: "media1" });
      }
      if (rest === "media1") return send(res, 200, { permalink: "https://www.instagram.com/reel/ABC123/" });
      if (rest === "17841400000") return send(res, 200, { followers_count: 3200, media_count: 80 });
      if (rest === "17841400000/insights" && url.searchParams.get("metric") === "follower_demographics") {
        const rows = {
          age: [["18-24", 1200], ["25-34", 1600], ["35-44", 400]],
          gender: [["F", 2000], ["M", 1100], ["U", 100]],
          country: [["FR", 2400], ["BE", 500], ["CH", 300]],
          city: [["Paris, Île-de-France", 900], ["Lyon, Auvergne-Rhône-Alpes", 300]],
        }[url.searchParams.get("breakdown")];
        return send(res, 200, { data: [{ name: "follower_demographics", total_value: { breakdowns: [{ results: rows.map(([k, v]) => ({ dimension_values: [k], value: v })) }] } }] });
      }
      if (rest === "media1/insights") return send(res, 200, { data: [{ name: "views", values: [{ value: 900 }] }, { name: "reach", values: [{ value: 700 }] }, { name: "likes", values: [{ value: 90 }] }, { name: "comments", values: [{ value: 5 }] }, { name: "shares", values: [{ value: 7 }] }, { name: "saved", values: [{ value: 11 }] }] });
    }
    send(res, 404, { error: { message: `mock: route inconnue ${req.method} ${p}` } });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve({ server, state })));
}
