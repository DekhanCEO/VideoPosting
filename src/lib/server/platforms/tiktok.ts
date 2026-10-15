import "server-only";
import { buildYoutubeDescription } from "../../captions";
import { tiktokChunks } from "../../chunks";
import { parseTiktokJson } from "../../tiktok-json";
import type { Account, TiktokCreatorInfo, TiktokPrivacy } from "../../types";
import { isPubliclyReachable } from "../config";
import { PlatformError, form, parseBody, readChunk, sleep, throwIfAborted } from "../http";
import { signedMediaUrl } from "../media";
import type { AccountData, PlatformAdapter, PublishContext, PublishResult, StatsResult } from "./types";

const AUTH_URL = "https://www.tiktok.com/v2/auth/authorize/";
const API = "https://open.tiktokapis.com/v2";

const DEFAULT_SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list,video.publish,video.upload";

const ERROR_MESSAGES: Record<string, string> = {
  spam_risk_too_many_posts: "Limite quotidienne de publications TikTok atteinte pour ce compte.",
  spam_risk_too_many_pending_share: "Trop de vidéos en attente dans la boîte de réception TikTok.",
  spam_risk_user_banned_from_posting: "Ce compte TikTok n'est temporairement pas autorisé à publier.",
  reached_active_user_cap: "Quota quotidien de l'application TikTok atteint.",
  unaudited_client_can_only_post_to_private_accounts:
    "Votre application TikTok n'est pas encore auditée : choisissez « Moi uniquement » ou faites auditer l'application.",
  privacy_level_option_mismatch: "Ce niveau de confidentialité n'est pas disponible pour ce compte TikTok.",
  access_token_invalid: "Session TikTok expirée : reconnectez le compte.",
  scope_not_authorized: "Autorisation TikTok manquante : reconnectez le compte en acceptant toutes les permissions.",
  scope_permission_missed: "Autorisation TikTok manquante : reconnectez le compte en acceptant toutes les permissions.",
  rate_limit_exceeded: "Trop de requêtes vers TikTok, réessayez dans une minute.",
  file_format_check_failed: "Format de vidéo refusé par TikTok.",
  duration_check_failed: "Durée de vidéo refusée par TikTok.",
  frame_rate_check_failed: "Fréquence d'images refusée par TikTok.",
  picture_size_check_failed: "Résolution refusée par TikTok (minimum 360 px).",
  video_pull_failed: "TikTok n'a pas pu récupérer la vidéo.",
  publish_cancelled: "Publication annulée côté TikTok.",
  auth_removed: "L'accès de l'application a été révoqué dans TikTok : reconnectez le compte.",
};

interface TiktokEnvelope<T> {
  data?: T;
  error?: { code?: string; message?: string; log_id?: string };
}

async function tiktokApi<T>(path: string, account: Account, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const parsed = parseTiktokJson(await res.text()) as TiktokEnvelope<T> | null;
  const code = parsed?.error?.code;
  if (!res.ok || (code && code !== "ok")) {
    const message = (code && ERROR_MESSAGES[code]) || parsed?.error?.message || `Erreur TikTok (${res.status})`;
    throw new PlatformError(message, parsed, res.status);
  }
  return (parsed?.data ?? {}) as T;
}

async function tokenRequest(params: URLSearchParams) {
  const res = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: params,
  });
  const body = (await parseBody(res)) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
    open_id?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  } | null;
  if (!res.ok || !body?.access_token) {
    throw new PlatformError(body?.error_description || body?.error || "Échec de l'authentification TikTok.", body, res.status);
  }
  return body;
}

export async function fetchCreatorInfo(account: Account): Promise<TiktokCreatorInfo> {
  const d = await tiktokApi<{
    creator_avatar_url?: string;
    creator_username?: string;
    creator_nickname?: string;
    privacy_level_options?: TiktokPrivacy[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  }>("/post/publish/creator_info/query/", account, {});
  return {
    creatorAvatarUrl: d.creator_avatar_url,
    creatorUsername: d.creator_username,
    creatorNickname: d.creator_nickname,
    privacyLevelOptions: d.privacy_level_options ?? [],
    commentDisabled: !!d.comment_disabled,
    duetDisabled: !!d.duet_disabled,
    stitchDisabled: !!d.stitch_disabled,
    maxVideoPostDurationSec: d.max_video_post_duration_sec ?? 600,
  };
}

export const tiktok: PlatformAdapter<"tiktok"> = {
  id: "tiktok",

  buildAuthUrl({ state, redirectUri, credentials }) {
    const p = new URLSearchParams({
      client_key: credentials.clientId,
      scope: process.env.TIKTOK_SCOPES || DEFAULT_SCOPES,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
    });
    return `${AUTH_URL}?${p}`;
  },

  async exchangeCode({ code, redirectUri, credentials }) {
    const token = await tokenRequest(
      form({
        client_key: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    );
    const account: AccountData = {
      platform: "tiktok",
      externalId: token.open_id ?? "",
      name: "Compte TikTok",
      accessToken: token.access_token!,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + (token.expires_in ?? 86400) * 1000,
      refreshExpiresAt: token.refresh_expires_in ? Date.now() + token.refresh_expires_in * 1000 : undefined,
      scopes: token.scope?.split(","),
    };

    const tmp = { ...account, connectedAt: Date.now() };
    try {
      const info = await tiktokApi<{ user?: { display_name?: string; avatar_url?: string; username?: string } }>(
        `/user/info/?fields=open_id,avatar_url,display_name${account.scopes?.includes("user.info.profile") ? ",username" : ""}`,
        tmp,
      );
      if (info.user?.display_name) account.name = info.user.display_name;
      account.avatarUrl = info.user?.avatar_url;
      account.username = info.user?.username;
    } catch {
      /* les infos de profil sont facultatives */
    }
    if (!account.username) {
      try {
        const creator = await fetchCreatorInfo(tmp);
        account.username = creator.creatorUsername;
        account.avatarUrl ??= creator.creatorAvatarUrl;
        if (creator.creatorNickname) account.name = creator.creatorNickname;
      } catch {
        /* idem */
      }
    }
    return account;
  },

  async refresh(account, credentials) {
    if (!account.refreshToken) throw new PlatformError("Session TikTok expirée : reconnectez le compte.");
    const token = await tokenRequest(
      form({
        client_key: credentials.clientId,
        client_secret: credentials.clientSecret,
        grant_type: "refresh_token",
        refresh_token: account.refreshToken,
      }),
    );
    return {
      accessToken: token.access_token!,
      refreshToken: token.refresh_token ?? account.refreshToken,
      expiresAt: Date.now() + (token.expires_in ?? 86400) * 1000,
      refreshExpiresAt: token.refresh_expires_in ? Date.now() + token.refresh_expires_in * 1000 : account.refreshExpiresAt,
    };
  },

  async publish(ctx) {
    const { options: o, media, account, signal } = ctx;
    const direct = o.mode === "direct";

    ctx.progress(2, "Vérification du compte TikTok");
    const creator = await fetchCreatorInfo(account);
    if (ctx.kind === "photo") return publishPhotos(ctx, creator);
    if (media.duration && media.duration > creator.maxVideoPostDurationSec) {
      throw new PlatformError(`Vidéo trop longue pour ce compte TikTok (max ${creator.maxVideoPostDurationSec} s).`);
    }
    if (direct && (!o.privacyLevel || !creator.privacyLevelOptions.includes(o.privacyLevel))) {
      throw new PlatformError("Le niveau de confidentialité choisi n'est pas disponible pour ce compte TikTok.");
    }

    const { chunkSize, count, ranges } = tiktokChunks(media.size);
    const sourceInfo = { source: "FILE_UPLOAD", video_size: media.size, chunk_size: chunkSize, total_chunk_count: count };

    let init: { publish_id: string; upload_url: string };
    if (direct) {
      init = await tiktokApi(
        "/post/publish/video/init/",
        account,
        {
          post_info: {
            title: o.caption,
            privacy_level: o.privacyLevel,
            disable_comment: creator.commentDisabled || !o.allowComments,
            disable_duet: creator.duetDisabled || !o.allowDuet,
            disable_stitch: creator.stitchDisabled || !o.allowStitch,
            video_cover_timestamp_ms: Math.max(0, Math.round(o.coverTimestampMs)),
            brand_content_toggle: o.commercialContent && o.brandedContent,
            brand_organic_toggle: o.commercialContent && o.yourBrand,
            is_aigc: o.isAigc,
          },
          source_info: sourceInfo,
        },
        signal,
      );
    } else {
      init = await tiktokApi("/post/publish/inbox/video/init/", account, { source_info: sourceInfo }, signal);
    }
    ctx.log(`Publication TikTok initialisée (${init.publish_id})`);

    for (let i = 0; i < ranges.length; i++) {
      throwIfAborted(signal);
      const [start, end] = ranges[i];
      const chunk = await readChunk(ctx.filePath, start, end - start + 1);
      let attempt = 0;
      while (true) {
        const res = await fetch(init.upload_url, {
          method: "PUT",
          headers: {
            "Content-Type": media.mimeType === "video/x-m4v" ? "video/mp4" : media.mimeType,
            "Content-Length": String(chunk.length),
            "Content-Range": `bytes ${start}-${end}/${media.size}`,
          },
          body: new Uint8Array(chunk),
          signal,
        }).catch((err) => {
          if (signal.aborted) throw err;
          return new Response(null, { status: 599 });
        });
        if (res.status === 201 || res.status === 206 || res.ok) break;
        if (res.status === 403) throw new PlatformError("L'URL d'envoi TikTok a expiré (plus d'une heure). Relancez la publication.");
        attempt++;
        if (attempt > 3 || (res.status < 500 && res.status !== 599)) {
          throw new PlatformError(`Envoi du morceau ${i + 1}/${count} refusé par TikTok (${res.status}).`, await parseBody(res));
        }
        await sleep(1500 * attempt, signal);
      }
      ctx.progress(5 + Math.round(((i + 1) / count) * 80), `Envoi vers TikTok (${i + 1}/${count})`);
    }

    ctx.progress(86, "TikTok traite la vidéo");
    return waitForTiktok(ctx, init.publish_id, "video");
  },

  async fetchStats({ account, externalIds }) {
    const result: StatsResult = { posts: {}, warnings: [] };
    const info = await tiktokApi<{
      user?: { follower_count?: number; likes_count?: number; video_count?: number };
    }>("/user/info/?fields=follower_count,likes_count,video_count", account);
    if (info.user) {
      result.snapshot = {
        followers: info.user.follower_count ?? 0,
        totalLikes: info.user.likes_count ?? 0,
        videoCount: info.user.video_count ?? 0,
      };
    }
    const ids = externalIds.filter((id) => /^\d+$/.test(id));
    for (let i = 0; i < ids.length; i += 20) {
      try {
        const data = await tiktokApi<{
          videos?: { id: string; view_count?: number; like_count?: number; comment_count?: number; share_count?: number }[];
        }>("/video/query/?fields=id,view_count,like_count,comment_count,share_count", account, {
          filters: { video_ids: ids.slice(i, i + 20) },
        });
        for (const v of data.videos ?? []) {
          result.posts![v.id] = {
            views: v.view_count ?? 0,
            likes: v.like_count ?? 0,
            comments: v.comment_count ?? 0,
            shares: v.share_count ?? 0,
          };
        }
      } catch (err) {
        result.warnings!.push(`Vidéos TikTok : ${(err as Error).message}`);
        break;
      }
    }
    return result;
  },
};

/** Suit le traitement d'une publication TikTok jusqu'à sa mise en ligne. */
async function waitForTiktok(ctx: PublishContext<"tiktok">, publishId: string, kind: "video" | "photo"): Promise<PublishResult> {
  const { account, signal } = ctx;
  const init = { publish_id: publishId };
  const label = kind === "photo" ? "les photos" : "la vidéo";
  const started = Date.now();
  while (true) {
    throwIfAborted(signal);
    const status = await tiktokApi<{
      status: string;
      fail_reason?: string;
      publicaly_available_post_id?: (string | number)[];
    }>("/post/publish/status/fetch/", account, { publish_id: init.publish_id }, signal);

    if (status.status === "FAILED") {
      const reason = status.fail_reason ?? "";
      throw new PlatformError(ERROR_MESSAGES[reason] || `TikTok a refusé ${label} (${reason || "raison inconnue"}).`, status);
    }
    if (status.status === "SEND_TO_USER_INBOX") {
      ctx.log(`${kind === "photo" ? "Photos envoyées" : "Vidéo envoyée"} dans la boîte de réception TikTok : ouvrez l'application pour finaliser.`);
      return { externalId: init.publish_id, url: account.username ? `https://www.tiktok.com/@${account.username}` : undefined };
    }
    if (status.status === "PUBLISH_COMPLETE") {
      const postId = status.publicaly_available_post_id?.[0];
      if (postId && account.username) {
        return { externalId: String(postId), url: `https://www.tiktok.com/@${account.username}/${kind}/${postId}` };
      }
      // Les vidéos privées n'ont pas d'identifiant public.
      return {
        externalId: postId ? String(postId) : init.publish_id,
        url: account.username ? `https://www.tiktok.com/@${account.username}` : undefined,
      };
    }
    const elapsed = Date.now() - started;
    if (elapsed > 30 * 60_000) throw new PlatformError(`TikTok met trop de temps à traiter ${label}. Vérifiez votre profil TikTok.`);
    ctx.progress(Math.min(98, 86 + Math.round(elapsed / 15_000)), `TikTok traite ${label}`);
    await sleep(4000, signal);
  }
}

/** Publication photo (carrousel de 1 à 35 images) : TikTok télécharge les images depuis l'hébergement. */
async function publishPhotos(ctx: PublishContext<"tiktok">, creator: TiktokCreatorInfo): Promise<PublishResult> {
  const { options: o, images, account, signal, post } = ctx;
  const direct = o.mode === "direct";
  if (direct && (!o.privacyLevel || !creator.privacyLevelOptions.includes(o.privacyLevel))) {
    throw new PlatformError("Le niveau de confidentialité choisi n'est pas disponible pour ce compte TikTok.");
  }
  const urls = images.map((img) => signedMediaUrl(img.id, 6 * 3600));
  if (urls.some((u) => !isPubliclyReachable(u)) && !process.env.VP_API_MOCK_BASE) {
    throw new PlatformError("TikTok doit télécharger les photos depuis une URL publique HTTPS (domaine vérifié dans TikTok for Developers).");
  }
  // Titre court (90 caractères) + description : la légende sans le titre lorsqu'elle est synchronisée.
  const title = Array.from(post.common.title.trim()).slice(0, 90).join("");
  const description = o.sync.caption ? buildYoutubeDescription(post.common) : o.caption;
  ctx.progress(20, "TikTok récupère les photos");
  const init = await tiktokApi<{ publish_id: string }>(
    "/post/publish/content/init/",
    account,
    {
      post_info: {
        title,
        description: Array.from(description).slice(0, 4000).join(""),
        ...(direct
          ? {
              privacy_level: o.privacyLevel,
              disable_comment: creator.commentDisabled || !o.allowComments,
              auto_add_music: o.autoAddMusic ?? true,
              brand_content_toggle: o.commercialContent && o.brandedContent,
              brand_organic_toggle: o.commercialContent && o.yourBrand,
            }
          : {}),
      },
      source_info: { source: "PULL_FROM_URL", photo_cover_index: 0, photo_images: urls },
      post_mode: direct ? "DIRECT_POST" : "MEDIA_UPLOAD",
      media_type: "PHOTO",
    },
    signal,
  );
  ctx.log(`Publication photo TikTok initialisée (${init.publish_id})`);
  ctx.progress(60, "TikTok traite les photos");
  return waitForTiktok(ctx, init.publish_id, "photo");
}
