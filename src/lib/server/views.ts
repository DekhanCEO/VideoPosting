import "server-only";
import type { Post, PostWithMedia } from "../types";
import { metricsFor } from "./analytics";
import { getMedia } from "./store";

/** Ajoute la vidéo et les métriques (synchronisées ou simulées) à une publication. */
export function withMedia(post: Post): PostWithMedia {
  const view: PostWithMedia = { ...post, media: post.mediaId ? (getMedia(post.mediaId) ?? null) : null };
  for (const platform of post.platforms) {
    const pub = view.publications[platform];
    const metrics = metricsFor(post, platform);
    if (pub && metrics) pub.metrics = metrics;
  }
  return view;
}
