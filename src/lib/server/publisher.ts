import "server-only";
import { resolveOptions } from "../captions";
import { PLATFORMS } from "../platforms";
import type { PlatformId, Post, PostStatus, Publication, PublicationLog } from "../types";
import { getUsableAccount } from "./accounts";
import { getCredentials } from "./config";
import { notifyDiscord } from "./discord";
import { AbortedError, PlatformError } from "./http";
import { mediaPath } from "./media";
import { adapters } from "./platforms";
import { demoPublish } from "./platforms/demo";
import type { PlatformAdapter, PublishContext } from "./platforms/types";
import { db, getMedia, getPost } from "./store";

const g = globalThis as unknown as { __vpRunning?: Map<string, AbortController> };
const running = (g.__vpRunning ??= new Map());

const key = (postId: string, platform: PlatformId) => `${postId}:${platform}`;
const MAX_LOGS = 60;

function patchPublication(postId: string, platform: PlatformId, patch: Partial<Publication>, log?: Omit<PublicationLog, "at">) {
  db().update((d) => {
    const post = d.posts.find((p) => p.id === postId);
    const pub = post?.publications[platform];
    if (!post || !pub) return;
    Object.assign(pub, patch);
    if (log) {
      pub.logs.push({ at: Date.now(), ...log });
      if (pub.logs.length > MAX_LOGS) pub.logs.splice(0, pub.logs.length - MAX_LOGS);
    }
    post.updatedAt = Date.now();
  });
}

/** Statut global d'une publication en fonction de l'état de chaque plateforme. */
export function computePostStatus(post: Post): PostStatus {
  const pubs = post.platforms.map((p) => post.publications[p]).filter(Boolean) as Publication[];
  if (pubs.length === 0) return post.status;
  if (pubs.some((p) => p.status === "pending" || p.status === "uploading" || p.status === "processing")) return "publishing";
  const published = pubs.filter((p) => p.status === "published").length;
  if (published === pubs.length) return "published";
  if (published > 0) return "partial";
  if (pubs.every((p) => p.status === "canceled")) return "draft";
  return "failed";
}

function refreshPostStatus(postId: string) {
  db().update((d) => {
    const post = d.posts.find((p) => p.id === postId);
    if (!post) return;
    const status = computePostStatus(post);
    if (status !== post.status) {
      post.status = status;
      if ((status === "published" || status === "partial") && !post.publishedAt) post.publishedAt = Date.now();
    }
  });
}

/**
 * Lance la publication sur les plateformes demandées (toutes par défaut).
 * Rend la main immédiatement : la progression est suivie dans le stockage.
 */
export function startPublishing(postId: string, only?: PlatformId[]) {
  const post = getPost(postId);
  if (!post) throw new Error("Publication introuvable.");
  if (post.kind === "photo" ? !post.imageIds?.length : !post.mediaId) throw new Error("Aucun média associé à cette publication.");

  const targets = (only ?? post.platforms).filter(
    (p) => post.platforms.includes(p) && !running.has(key(postId, p)) && post.publications[p]?.status !== "published",
  );
  if (targets.length === 0) {
    refreshPostStatus(postId);
    return;
  }

  db().update((d) => {
    const p = d.posts.find((x) => x.id === postId)!;
    for (const platform of targets) {
      const previous = p.publications[platform];
      p.publications[platform] = {
        platform,
        status: "pending",
        progress: 0,
        step: "En attente",
        attempt: (previous?.attempt ?? 0) + 1,
        logs: [...(previous?.logs ?? []), { at: Date.now(), level: "info", message: `Tentative n°${(previous?.attempt ?? 0) + 1}` }],
      };
    }
    p.status = "publishing";
    p.updatedAt = Date.now();
  });

  for (const platform of targets) {
    void runPublication(postId, platform);
  }
}

async function runPublication(postId: string, platform: PlatformId) {
  const controller = new AbortController();
  running.set(key(postId, platform), controller);
  const name = PLATFORMS[platform].name;
  let lastProgress = -1;

  try {
    const post = getPost(postId);
    const kind = post?.kind ?? "video";
    const images = kind === "photo" ? (post?.imageIds ?? []).map((id) => getMedia(id)) : [];
    if (images.some((i) => !i || i.status !== "ready")) throw new PlatformError("Une photo n'est pas disponible.");
    const media = kind === "photo" ? images[0] : post?.mediaId ? getMedia(post.mediaId) : undefined;
    if (!post || !media || media.status !== "ready") throw new PlatformError(kind === "photo" ? "Aucune photo à publier." : "La vidéo n'est pas disponible.");
    if (kind === "photo" && platform === "youtube") throw new PlatformError("YouTube n'accepte que des vidéos.");

    const account = await getUsableAccount(platform);
    const options = resolveOptions(post.common, post.options)[platform];
    const thumbAsset =
      platform === "youtube" && post.options.youtube.thumbnailId ? getMedia(post.options.youtube.thumbnailId) : undefined;

    patchPublication(
      postId,
      platform,
      { status: "uploading", startedAt: Date.now(), error: undefined, demo: !!account.demo, step: `Connexion à ${name}` },
      { level: "info", message: `Publication sur ${name}${account.username ? ` (${account.username})` : ""}` },
    );

    const ctx: PublishContext = {
      post,
      media,
      filePath: mediaPath(media),
      kind,
      images: images as NonNullable<(typeof images)[number]>[],
      account,
      credentials: getCredentials(platform),
      options,
      thumbnail: thumbAsset ? { filePath: mediaPath(thumbAsset), mimeType: thumbAsset.mimeType, size: thumbAsset.size } : undefined,
      signal: controller.signal,
      progress: (percent, step) => {
        const value = Math.max(0, Math.min(99, Math.round(percent)));
        if (value === lastProgress && !step) return;
        lastProgress = value;
        patchPublication(postId, platform, {
          progress: value,
          step: step ?? undefined,
          status: value >= 86 ? "processing" : "uploading",
        });
      },
      log: (message, level = "info") => patchPublication(postId, platform, {}, { level, message }),
    };

    const adapter = adapters[platform] as unknown as PlatformAdapter;
    const result = account.demo ? await demoPublish(platform, ctx) : await adapter.publish(ctx);

    patchPublication(
      postId,
      platform,
      {
        status: "published",
        progress: 100,
        step: "Publiée",
        externalId: result.externalId,
        url: result.url,
        finishedAt: Date.now(),
      },
      { level: "info", message: `Publiée sur ${name}` },
    );
  } catch (err) {
    const aborted = err instanceof AbortedError || controller.signal.aborted;
    const message = aborted
      ? "Publication annulée."
      : err instanceof PlatformError
        ? err.message
        : `Erreur inattendue : ${(err as Error).message}`;
    if (!aborted && !(err instanceof PlatformError)) console.error(`[publisher] ${platform}`, err);
    patchPublication(
      postId,
      platform,
      { status: aborted ? "canceled" : "failed", error: message, step: aborted ? "Annulée" : "Échec", finishedAt: Date.now() },
      { level: aborted ? "warn" : "error", message },
    );
  } finally {
    running.delete(key(postId, platform));
    refreshPostStatus(postId);
    // Annonce Discord des liens en ligne (jamais bloquante pour la publication).
    void notifyDiscord(postId, platform).catch((err) => console.error("[discord]", err));
  }
}

export function cancelPublication(postId: string, platform?: PlatformId): boolean {
  let canceled = false;
  for (const [k, controller] of running) {
    const [pid, plat] = k.split(":");
    if (pid === postId && (!platform || plat === platform)) {
      controller.abort();
      canceled = true;
    }
  }
  return canceled;
}

export function isRunning(postId: string): boolean {
  for (const k of running.keys()) if (k.startsWith(`${postId}:`)) return true;
  return false;
}

/** Au démarrage : les publications interrompues par un arrêt du serveur passent en échec. */
export function recoverInterrupted() {
  const ids: string[] = [];
  db().update((d) => {
    for (const post of d.posts) {
      if (post.status !== "publishing") continue;
      for (const pub of Object.values(post.publications)) {
        if (!pub) continue;
        if (pub.status === "pending" || pub.status === "uploading" || pub.status === "processing") {
          if (running.has(key(post.id, pub.platform))) continue;
          pub.status = "failed";
          pub.error = "Interrompue par un redémarrage du serveur. Relancez la publication.";
          pub.step = "Échec";
          pub.logs.push({ at: Date.now(), level: "error", message: pub.error });
        }
      }
      ids.push(post.id);
    }
  });
  ids.forEach(refreshPostStatus);
}
