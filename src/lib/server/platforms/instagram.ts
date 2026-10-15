import "server-only";
import { AGE_BUCKETS, type Account, type AgeBucket } from "../../types";
import { isPubliclyReachable, type ResolvedCredentials } from "../config";
import { PlatformError, form, parseBody, sleep, streamUpload, throwIfAborted } from "../http";
import { signedMediaUrl } from "../media";
import type { AccountData, PlatformAdapter, StatsResult } from "./types";

/**
 * Deux façons de connecter Instagram :
 *  - « instagram » : Instagram API avec connexion Instagram (graph.instagram.com).
 *    Simple à configurer, mais Instagram télécharge la vidéo depuis une URL publique
 *    → l'application doit être accessible en HTTPS (PUBLIC_URL).
 *  - « facebook » : Instagram API avec Facebook Login for Business (graph.facebook.com).
 *    Nécessite une Page Facebook liée au compte pro, mais la vidéo est envoyée
 *    directement (envoi « resumable » vers rupload.facebook.com).
 */

const IG_SCOPES = ["instagram_business_basic", "instagram_business_content_publish", "instagram_business_manage_insights"];
const FB_SCOPES = [
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
];

interface GraphError {
  error?: { message?: string; code?: number; error_subcode?: number; error_user_msg?: string; error_user_title?: string };
  error_message?: string;
}

function graphMessage(body: unknown, fallback: string): string {
  const b = body as GraphError | null;
  const e = b?.error;
  if (!e) return b?.error_message || fallback;
  if (e.code === 190) return "Session Instagram expirée : reconnectez le compte.";
  if (e.code === 4 || e.code === 17 || e.code === 32) return "Limite de requêtes Instagram atteinte, réessayez plus tard.";
  if (e.code === 9 && e.error_subcode === 2207042) return "Limite de 100 publications par 24 h atteinte sur Instagram.";
  return e.error_user_msg || e.message || fallback;
}

async function graph<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  const res = await fetch(url, init);
  const body = await parseBody(res);
  if (!res.ok || (body && typeof body === "object" && "error" in body)) {
    throw new PlatformError(graphMessage(body, fallback), body, res.status);
  }
  return body as T;
}

function host(account: Account): string {
  return account.meta?.loginType === "facebook" ? "https://graph.facebook.com" : "https://graph.instagram.com";
}

function version(account: Account, credentials?: ResolvedCredentials): string {
  return credentials?.graphVersion || String(account.meta?.graphVersion || "v24.0");
}

function igUserId(account: Account): string {
  return String(account.meta?.igUserId || account.externalId);
}

/** Codes d'erreur fréquents renvoyés dans le champ « status » d'un conteneur. */
function containerError(status: string | undefined): string {
  const s = status ?? "";
  if (s.includes("2207026")) return "Format vidéo non pris en charge par Instagram (codec, durée ou ratio).";
  if (s.includes("2207076") || s.includes("2207077")) return "Instagram n'a pas pu télécharger la vidéo : vérifiez que PUBLIC_URL est accessible depuis Internet.";
  if (s.includes("2207003")) return "Le téléchargement de la vidéo par Instagram a expiré.";
  if (s.includes("2207004")) return "Vidéo trop volumineuse pour Instagram.";
  if (s.includes("2207050")) return "Le compte Instagram est restreint ou inactif.";
  return `Instagram a refusé la vidéo${s ? ` (${s})` : ""}.`;
}

export const instagram: PlatformAdapter<"instagram"> = {
  id: "instagram",

  buildAuthUrl({ state, redirectUri, credentials }) {
    if (credentials.loginType === "facebook") {
      const p = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        state,
        response_type: "code",
        scope: FB_SCOPES.join(","),
      });
      return `https://www.facebook.com/${credentials.graphVersion}/dialog/oauth?${p}`;
    }
    const p = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: IG_SCOPES.join(","),
      state,
    });
    return `https://www.instagram.com/oauth/authorize?${p}`;
  },

  async exchangeCode({ code, redirectUri, credentials }) {
    const v = credentials.graphVersion;
    const cleanCode = code.replace(/#_$/, "");

    if (credentials.loginType === "facebook") {
      const short = await graph<{ access_token: string }>(
        `https://graph.facebook.com/${v}/oauth/access_token?${new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          redirect_uri: redirectUri,
          code: cleanCode,
        })}`,
        undefined,
        "Échec de l'authentification Facebook.",
      );
      const long = await graph<{ access_token: string; expires_in?: number }>(
        `https://graph.facebook.com/${v}/oauth/access_token?${new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          fb_exchange_token: short.access_token,
        })}`,
        undefined,
        "Impossible d'obtenir un jeton longue durée.",
      );
      const pages = await graph<{
        data?: {
          id: string;
          name: string;
          instagram_business_account?: { id: string; username?: string; name?: string; profile_picture_url?: string };
        }[];
      }>(
        `https://graph.facebook.com/${v}/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url}&access_token=${long.access_token}`,
        undefined,
        "Impossible de lister vos Pages Facebook.",
      );
      const page = pages.data?.find((p) => p.instagram_business_account);
      if (!page?.instagram_business_account) {
        throw new PlatformError(
          "Aucun compte Instagram professionnel n'est lié à vos Pages Facebook. Liez votre compte Instagram (Business ou Créateur) à une Page puis réessayez.",
        );
      }
      const ig = page.instagram_business_account;
      return {
        platform: "instagram",
        externalId: ig.id,
        name: ig.name || ig.username || page.name,
        username: ig.username,
        avatarUrl: ig.profile_picture_url,
        accessToken: long.access_token,
        expiresAt: long.expires_in ? Date.now() + long.expires_in * 1000 : Date.now() + 60 * 86400_000,
        meta: { loginType: "facebook", igUserId: ig.id, pageId: page.id, pageName: page.name, graphVersion: v },
      } satisfies AccountData;
    }

    const shortRes = await graph<
      { access_token?: string; user_id?: string | number } & { data?: { access_token: string; user_id: string | number }[] }
    >(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        body: form({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code: cleanCode,
        }),
      },
      "Échec de l'authentification Instagram.",
    );
    const shortToken = shortRes.access_token ?? shortRes.data?.[0]?.access_token;
    if (!shortToken) throw new PlatformError("Instagram n'a pas renvoyé de jeton d'accès.");

    const long = await graph<{ access_token: string; expires_in: number }>(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: credentials.clientSecret,
        access_token: shortToken,
      })}`,
      undefined,
      "Impossible d'obtenir un jeton Instagram longue durée.",
    );
    const me = await graph<{
      id: string;
      user_id?: string | number;
      username?: string;
      name?: string;
      profile_picture_url?: string;
      account_type?: string;
    }>(
      `https://graph.instagram.com/${v}/me?fields=id,user_id,username,name,profile_picture_url,account_type&access_token=${long.access_token}`,
      undefined,
      "Impossible de lire le profil Instagram.",
    );
    const userId = String(me.user_id ?? me.id);
    return {
      platform: "instagram",
      externalId: userId,
      name: me.name || me.username || "Compte Instagram",
      username: me.username,
      avatarUrl: me.profile_picture_url,
      accessToken: long.access_token,
      expiresAt: Date.now() + long.expires_in * 1000,
      meta: { loginType: "instagram", igUserId: userId, accountType: me.account_type, graphVersion: v },
    } satisfies AccountData;
  },

  async refresh(account) {
    if (account.meta?.loginType === "facebook") {
      throw new PlatformError("Session Instagram (via Facebook) expirée : reconnectez le compte.");
    }
    const res = await graph<{ access_token: string; expires_in: number }>(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${account.accessToken}`,
      undefined,
      "Session Instagram expirée : reconnectez le compte.",
    );
    return { accessToken: res.access_token, expiresAt: Date.now() + res.expires_in * 1000 };
  },

  async publish(ctx) {
    const { options: o, media, account, signal, credentials } = ctx;
    const base = `${host(account)}/${version(account, credentials)}`;
    const userId = igUserId(account);
    const viaFacebook = account.meta?.loginType === "facebook";

    const params: Record<string, string | number | boolean | undefined> = {
      media_type: "REELS",
      caption: o.caption,
      share_to_feed: o.shareToFeed,
      thumb_offset: Math.max(0, Math.round(o.thumbOffsetMs)),
      collaborators: o.collaborators.length ? JSON.stringify(o.collaborators.map((c) => c.replace(/^@/, ""))) : undefined,
      audio_name: o.audioName || undefined,
      location_id: o.locationId || undefined,
      access_token: account.accessToken,
    };

    if (viaFacebook) {
      params.upload_type = "resumable";
    } else {
      const url = signedMediaUrl(media.id, 6 * 3600);
      if (!isPubliclyReachable(url) && !process.env.VP_API_MOCK_BASE) {
        throw new PlatformError(
          "Instagram doit télécharger la vidéo depuis une URL publique HTTPS. Définissez PUBLIC_URL (ex. via un tunnel) ou passez à la connexion « Facebook Login » dans les paramètres.",
        );
      }
      params.video_url = url;
    }

    ctx.progress(3, "Création du Reel sur Instagram");
    const container = await graph<{ id: string; uri?: string }>(
      `${base}/${userId}/media`,
      { method: "POST", body: form(params), signal },
      "Instagram a refusé la création du Reel.",
    );
    ctx.log(`Conteneur Instagram créé (${container.id})`);

    if (viaFacebook) {
      const uploadUrl = container.uri || `https://rupload.facebook.com/ig-api-upload/${version(account, credentials)}/${container.id}`;
      let lastReport = 0;
      const res = await streamUpload({
        url: uploadUrl,
        method: "POST",
        headers: {
          Authorization: `OAuth ${account.accessToken}`,
          offset: "0",
          file_size: String(media.size),
          "Content-Type": "application/octet-stream",
        },
        filePath: ctx.filePath,
        size: media.size,
        signal,
        onProgress: (sent) => {
          const now = Date.now();
          if (now - lastReport > 500 || sent === media.size) {
            lastReport = now;
            ctx.progress(5 + Math.round((sent / media.size) * 70), "Envoi de la vidéo vers Instagram");
          }
        },
      });
      if (res.status < 200 || res.status >= 300) {
        throw new PlatformError(graphMessage(res.body, `Envoi vers Instagram refusé (${res.status}).`), res.body, res.status);
      }
      ctx.log("Vidéo transférée à Instagram");
    } else {
      ctx.progress(10, "Instagram récupère la vidéo");
    }

    const started = Date.now();
    while (true) {
      throwIfAborted(signal);
      const status = await graph<{ status_code?: string; status?: string }>(
        `${base}/${container.id}?fields=status_code,status&access_token=${account.accessToken}`,
        { signal },
        "Impossible de suivre le traitement Instagram.",
      );
      if (status.status_code === "FINISHED") break;
      if (status.status_code === "ERROR") throw new PlatformError(containerError(status.status), status);
      if (status.status_code === "EXPIRED") throw new PlatformError("Le conteneur Instagram a expiré (24 h). Relancez la publication.");
      const elapsed = Date.now() - started;
      if (elapsed > 20 * 60_000) throw new PlatformError("Instagram met trop de temps à traiter la vidéo.");
      ctx.progress(Math.min(92, (viaFacebook ? 76 : 12) + Math.round(elapsed / 10_000)), "Instagram traite la vidéo");
      await sleep(5000, signal);
    }

    ctx.progress(94, "Publication du Reel");
    let published: { id: string } | null = null;
    for (let attempt = 0; attempt < 5 && !published; attempt++) {
      try {
        published = await graph<{ id: string }>(
          `${base}/${userId}/media_publish`,
          { method: "POST", body: form({ creation_id: container.id, access_token: account.accessToken }), signal },
          "Instagram a refusé la publication.",
        );
      } catch (err) {
        if (attempt === 4) throw err;
        ctx.log(`Publication pas encore possible, nouvelle tentative… (${(err as Error).message})`, "warn");
        await sleep(5000, signal);
      }
    }

    let url: string | undefined;
    try {
      const info = await graph<{ permalink?: string }>(
        `${base}/${published!.id}?fields=permalink&access_token=${account.accessToken}`,
        { signal },
        "",
      );
      url = info.permalink;
    } catch {
      url = account.username ? `https://www.instagram.com/${account.username}/reels/` : undefined;
    }
    return { externalId: published!.id, url };
  },

  async fetchStats({ account, credentials, externalIds }) {
    const base = `${host(account)}/${version(account, credentials)}`;
    const token = account.accessToken;
    const result: StatsResult = { posts: {}, warnings: [] };

    const me = await graph<{ followers_count?: number; media_count?: number }>(
      `${base}/${igUserId(account)}?fields=followers_count,media_count&access_token=${token}`,
      undefined,
      "Impossible de lire les statistiques Instagram.",
    );
    result.snapshot = { followers: me.followers_count ?? 0, videoCount: me.media_count ?? 0 };

    for (const id of externalIds) {
      try {
        const insights = await graph<{ data?: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(
          `${base}/${id}/insights?metric=views,reach,likes,comments,shares,saved&access_token=${token}`,
          undefined,
          "Insights indisponibles",
        );
        const get = (name: string) => {
          const m = insights.data?.find((d) => d.name === name);
          return m?.total_value?.value ?? m?.values?.[0]?.value ?? 0;
        };
        result.posts![id] = {
          views: get("views"),
          likes: get("likes"),
          comments: get("comments"),
          shares: get("shares"),
          saves: get("saved"),
          reach: get("reach") || undefined,
        };
      } catch {
        try {
          const media = await graph<{ like_count?: number; comments_count?: number }>(
            `${base}/${id}?fields=like_count,comments_count&access_token=${token}`,
            undefined,
            "",
          );
          result.posts![id] = { views: 0, likes: media.like_count ?? 0, comments: media.comments_count ?? 0, shares: 0 };
        } catch (err) {
          result.warnings!.push(`Reel ${id} : ${(err as Error).message}`);
        }
      }
    }

    // Audience des abonnés (comptes professionnels d'au moins 100 abonnés).
    try {
      const breakdown = async (dimension: "age" | "gender" | "country" | "city") => {
        const r = await graph<{ data?: { total_value?: { breakdowns?: { results?: { dimension_values: string[]; value: number }[] }[] } }[] }>(
          `${base}/${igUserId(account)}/insights?metric=follower_demographics&period=lifetime&metric_type=total_value&breakdown=${dimension}&access_token=${token}`,
          undefined,
          "Audience Instagram indisponible (compte professionnel d'au moins 100 abonnés requis)",
        );
        return (r.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? []).map((x) => [String(x.dimension_values[0] ?? ""), Number(x.value) || 0] as const);
      };
      const shares = (rows: (readonly [string, number])[]) => {
        const total = rows.reduce((n, [, v]) => n + v, 0);
        return total ? rows.map(([k, v]) => [k, v / total] as const).sort((a, b) => b[1] - a[1]) : [];
      };
      const [age, gender, country, city] = await Promise.all([breakdown("age"), breakdown("gender"), breakdown("country"), breakdown("city")]);
      const g = Object.fromEntries(shares(gender));
      result.audience = {
        basis: "followers",
        gender: gender.length ? { female: g.F ?? 0, male: g.M ?? 0, other: g.U ?? 0 } : undefined,
        ages: age.length ? (Object.fromEntries(shares(age).filter(([k]) => (AGE_BUCKETS as readonly string[]).includes(k))) as Partial<Record<AgeBucket, number>>) : undefined,
        countries: country.length ? shares(country).slice(0, 30).map(([code, share]) => ({ code: code.toUpperCase(), share })) : undefined,
        cities: city.length ? shares(city).slice(0, 10).map(([name, share]) => ({ name: name.split(",")[0], share })) : undefined,
      };
    } catch (err) {
      result.warnings!.push(`Audience Instagram : ${(err as Error).message}`);
    }
    return result;
  },
};
