import "server-only";
import { isYoutubeShort } from "../../platforms";
import type { Account } from "../../types";
import { getSettings } from "../store";
import { PlatformError, form, parseBody, readChunk, sleep, throwIfAborted } from "../http";
import type { AccountData, PlatformAdapter, StatsResult } from "./types";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/youtube/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/youtube/v3";
const ANALYTICS_API = "https://youtubeanalytics.googleapis.com/v2/reports";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
  "https://www.googleapis.com/auth/yt-analytics-monetary.readonly",
];

/** Taille des morceaux d'envoi : doit être un multiple de 256 Kio. */
const CHUNK_SIZE = 32 * 256 * 1024; // 8 Mio

interface GoogleError {
  error?: { code?: number; message?: string; errors?: { reason?: string; message?: string }[] } | string;
  error_description?: string;
}

function googleMessage(body: unknown, fallback: string): string {
  const b = body as GoogleError | null;
  if (!b || typeof b !== "object") return fallback;
  if (typeof b.error === "string") return b.error_description || b.error;
  const reason = b.error?.errors?.[0]?.reason;
  switch (reason) {
    case "quotaExceeded":
      return "Quota de l'API YouTube épuisé pour aujourd'hui (un envoi consomme 1 600 unités sur 10 000). Réessayez demain ou demandez une augmentation de quota.";
    case "uploadLimitExceeded":
      return "Limite d'envois quotidienne de la chaîne YouTube atteinte.";
    case "youtubeSignupRequired":
      return "Ce compte Google n'a pas de chaîne YouTube. Créez-en une sur youtube.com puis reconnectez-vous.";
    case "invalidTitle":
      return "Titre refusé par YouTube (vide, trop long ou caractères interdits).";
    case "invalidDescription":
      return "Description refusée par YouTube.";
    case "invalidTags":
      return "Tags refusés par YouTube.";
    case "forbidden":
    case "insufficientPermissions":
      return "Autorisations YouTube insuffisantes : reconnectez le compte.";
  }
  return b.error?.message || fallback;
}

async function googleFetch<T>(url: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await fetch(url, init);
  const body = await parseBody(res);
  if (!res.ok) throw new PlatformError(googleMessage(body, fallback), body, res.status);
  return body as T;
}

function bearer(account: Account) {
  return { Authorization: `Bearer ${account.accessToken}` };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const youtube: PlatformAdapter<"youtube"> = {
  id: "youtube",

  buildAuthUrl({ state, redirectUri, credentials }) {
    const p = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES.join(" "),
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });
    return `${AUTH_URL}?${p}`;
  },

  async exchangeCode({ code, redirectUri, credentials }) {
    const token = await googleFetch<{
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    }>(
      TOKEN_URL,
      {
        method: "POST",
        body: form({
          code,
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      },
      "Échec de l'échange du code Google.",
    );

    const channels = await googleFetch<{
      items?: { id: string; snippet: { title: string; customUrl?: string; thumbnails?: Record<string, { url: string }> } }[];
    }>(`${API}/channels?part=snippet&mine=true`, { headers: { Authorization: `Bearer ${token.access_token}` } }, "Impossible de lire la chaîne YouTube.");

    const channel = channels.items?.[0];
    if (!channel) {
      throw new PlatformError("Ce compte Google n'a pas de chaîne YouTube. Créez-en une sur youtube.com puis réessayez.");
    }
    const thumbs = channel.snippet.thumbnails ?? {};
    const account: AccountData = {
      platform: "youtube",
      externalId: channel.id,
      name: channel.snippet.title,
      username: channel.snippet.customUrl,
      avatarUrl: thumbs.high?.url ?? thumbs.medium?.url ?? thumbs.default?.url,
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + token.expires_in * 1000,
      scopes: token.scope?.split(" "),
    };
    return account;
  },

  async refresh(account, credentials) {
    if (!account.refreshToken) throw new PlatformError("Session YouTube expirée : reconnectez le compte.");
    const token = await googleFetch<{ access_token: string; expires_in: number }>(
      TOKEN_URL,
      {
        method: "POST",
        body: form({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: account.refreshToken,
          grant_type: "refresh_token",
        }),
      },
      "Session YouTube expirée : reconnectez le compte.",
    );
    return { accessToken: token.access_token, expiresAt: Date.now() + token.expires_in * 1000 };
  },

  async publish(ctx) {
    const { options: o, media, account, signal } = ctx;
    ctx.progress(2, "Préparation de l'envoi vers YouTube");

    const metadata = {
      snippet: {
        title: o.title.trim(),
        description: o.description,
        tags: o.tags.length ? o.tags : undefined,
        categoryId: o.categoryId,
        defaultLanguage: o.defaultLanguage || undefined,
        defaultAudioLanguage: o.defaultLanguage || undefined,
      },
      status: {
        privacyStatus: o.privacy,
        selfDeclaredMadeForKids: o.madeForKids,
        embeddable: o.embeddable,
        license: o.license,
        containsSyntheticMedia: o.containsSyntheticMedia,
      },
    };

    const initUrl = `${UPLOAD_API}/videos?uploadType=resumable&part=snippet,status&notifySubscribers=${o.notifySubscribers}`;
    const init = await fetch(initUrl, {
      method: "POST",
      headers: {
        ...bearer(account),
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(media.size),
        "X-Upload-Content-Type": media.mimeType,
      },
      body: JSON.stringify(metadata),
      signal,
    });
    if (!init.ok) {
      const body = await parseBody(init);
      throw new PlatformError(googleMessage(body, "YouTube a refusé l'initialisation de l'envoi."), body, init.status);
    }
    const uploadUrl = init.headers.get("location");
    if (!uploadUrl) throw new PlatformError("YouTube n'a pas renvoyé d'URL d'envoi.");
    ctx.log("Session d'envoi YouTube ouverte");

    let offset = 0;
    let video: { id: string } | null = null;
    let failures = 0;

    while (!video) {
      throwIfAborted(signal);
      const length = Math.min(CHUNK_SIZE, media.size - offset);
      const chunk = await readChunk(ctx.filePath, offset, length);
      let res: Response;
      try {
        res = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            ...bearer(account),
            "Content-Length": String(chunk.length),
            "Content-Range": `bytes ${offset}-${offset + chunk.length - 1}/${media.size}`,
          },
          body: new Uint8Array(chunk),
          redirect: "manual",
          signal,
        });
      } catch (err) {
        if (signal.aborted) throw err;
        res = new Response(null, { status: 599 });
      }

      if (res.status === 200 || res.status === 201) {
        video = (await res.json()) as { id: string };
        break;
      }
      if (res.status === 308) {
        const range = res.headers.get("range");
        offset = range ? Number(range.split("-")[1]) + 1 : 0;
        failures = 0;
        ctx.progress(5 + Math.round((offset / media.size) * 85), "Envoi de la vidéo vers YouTube");
        continue;
      }
      if (res.status >= 500 || res.status === 599) {
        failures++;
        if (failures > 5) throw new PlatformError("Envoi YouTube interrompu après plusieurs tentatives.");
        ctx.log(`Erreur réseau / serveur (${res.status}), nouvelle tentative…`, "warn");
        await sleep(1000 * 2 ** failures, signal);
        // Demande à YouTube jusqu'où il a bien reçu le fichier.
        const status = await fetch(uploadUrl, {
          method: "PUT",
          headers: { ...bearer(account), "Content-Length": "0", "Content-Range": `bytes */${media.size}` },
          redirect: "manual",
          signal,
        }).catch(() => null);
        if (status?.status === 308) {
          const range = status.headers.get("range");
          offset = range ? Number(range.split("-")[1]) + 1 : 0;
        } else if (status && (status.status === 200 || status.status === 201)) {
          video = (await status.json()) as { id: string };
        }
        continue;
      }
      const body = await parseBody(res);
      throw new PlatformError(googleMessage(body, `Envoi YouTube refusé (${res.status}).`), body, res.status);
    }

    ctx.log(`Vidéo envoyée (id ${video.id})`);

    if (ctx.thumbnail) {
      ctx.progress(93, "Ajout de la miniature");
      try {
        const image = await readChunk(ctx.thumbnail.filePath, 0, ctx.thumbnail.size);
        await googleFetch(
          `${UPLOAD_API}/thumbnails/set?videoId=${video.id}&uploadType=media`,
          {
            method: "POST",
            headers: { ...bearer(account), "Content-Type": ctx.thumbnail.mimeType },
            body: new Uint8Array(image),
            signal,
          },
          "Miniature refusée",
        );
        ctx.log("Miniature personnalisée appliquée");
      } catch (err) {
        ctx.log(
          `Miniature non appliquée : ${(err as Error).message}. (La chaîne doit être validée pour les miniatures personnalisées.)`,
          "warn",
        );
      }
    }

    const short = isYoutubeShort(media);
    return {
      externalId: video.id,
      url: short ? `https://www.youtube.com/shorts/${video.id}` : `https://www.youtube.com/watch?v=${video.id}`,
    };
  },

  async fetchStats({ account, externalIds, days }) {
    const result: StatsResult = { posts: {}, daily: [], warnings: [] };
    const headers = bearer(account);

    const channel = await googleFetch<{
      items?: { statistics: { subscriberCount?: string; viewCount?: string; videoCount?: string } }[];
    }>(`${API}/channels?part=statistics&mine=true`, { headers }, "Impossible de lire les statistiques de la chaîne.");
    const stats = channel.items?.[0]?.statistics;
    if (stats) {
      result.snapshot = {
        followers: Number(stats.subscriberCount ?? 0),
        totalViews: Number(stats.viewCount ?? 0),
        videoCount: Number(stats.videoCount ?? 0),
      };
    }

    for (let i = 0; i < externalIds.length; i += 50) {
      const ids = externalIds.slice(i, i + 50).join(",");
      const videos = await googleFetch<{
        items?: { id: string; statistics: { viewCount?: string; likeCount?: string; commentCount?: string } }[];
      }>(`${API}/videos?part=statistics&id=${ids}`, { headers }, "Impossible de lire les statistiques des vidéos.");
      for (const v of videos.items ?? []) {
        result.posts![v.id] = {
          views: Number(v.statistics.viewCount ?? 0),
          likes: Number(v.statistics.likeCount ?? 0),
          comments: Number(v.statistics.commentCount ?? 0),
          shares: 0,
        };
      }
    }

    // YouTube Analytics : vues, durée de visionnage et abonnés par jour.
    const end = new Date();
    const start = new Date(Date.now() - days * 86400_000);
    const base = `${ANALYTICS_API}?ids=channel==MINE&startDate=${isoDate(start)}&endDate=${isoDate(end)}&dimensions=day&sort=day`;
    const byDate = new Map<string, NonNullable<StatsResult["daily"]>[number]>();
    try {
      const report = await googleFetch<{ rows?: (string | number)[][] }>(
        `${base}&metrics=views,estimatedMinutesWatched,subscribersGained,subscribersLost`,
        { headers },
        "YouTube Analytics indisponible",
      );
      for (const [date, views, minutes, gained, lost] of report.rows ?? []) {
        byDate.set(String(date), {
          date: String(date),
          views: Number(views),
          watchMinutes: Number(minutes),
          followersGained: Number(gained) - Number(lost),
        });
      }
    } catch (err) {
      result.warnings!.push(`YouTube Analytics : ${(err as Error).message}`);
    }

    // Revenus estimés : uniquement pour les chaînes monétisées (Programme Partenaire YouTube).
    try {
      const currency = getSettings().currency || "EUR";
      const report = await googleFetch<{ rows?: (string | number)[][] }>(
        `${base}&metrics=estimatedRevenue&currency=${currency}`,
        { headers },
        "Revenus indisponibles",
      );
      for (const [date, revenue] of report.rows ?? []) {
        const entry = byDate.get(String(date)) ?? { date: String(date) };
        entry.revenue = Number(revenue);
        byDate.set(String(date), entry);
      }
      result.revenueAvailable = true;
    } catch {
      result.revenueAvailable = false;
    }

    result.daily = [...byDate.values()];
    return result;
  },
};
