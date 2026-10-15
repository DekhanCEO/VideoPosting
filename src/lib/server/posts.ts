import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { defaultOptions } from "../captions";
import { PLATFORM_IDS, type Post, type PostInput, type PostStatus } from "../types";
import { deleteMediaIfUnused } from "./media";
import { db, getPost, getSettings } from "./store";

const str = (max: number) => z.string().max(max).default("");

const tags = z.array(z.string().trim().min(1).max(100)).max(100).default([]);

export const postInputSchema = z.object({
  kind: z.enum(["video", "photo"]).default("video"),
  mediaId: z.string().uuid().optional(),
  imageIds: z.array(z.string().uuid()).max(35).default([]).transform((ids) => [...new Set(ids)]),
  common: z.object({
    title: str(500),
    description: str(10000),
    hashtags: tags,
  }),
  platforms: z.array(z.enum(PLATFORM_IDS)).max(3).transform((p) => [...new Set(p)]),
  options: z.object({
    youtube: z.object({
      title: str(500),
      description: str(10000),
      tags,
      sync: z.object({ title: z.boolean(), description: z.boolean(), tags: z.boolean() }),
      categoryId: z.string().max(4),
      privacy: z.enum(["public", "unlisted", "private"]),
      madeForKids: z.boolean(),
      notifySubscribers: z.boolean(),
      embeddable: z.boolean(),
      license: z.enum(["youtube", "creativeCommon"]),
      containsSyntheticMedia: z.boolean(),
      defaultLanguage: z.string().max(10),
      thumbnailId: z.string().uuid().optional(),
      format: z.enum(["auto", "short", "long"]).default("auto"),
    }),
    tiktok: z.object({
      caption: str(5000),
      sync: z.object({ caption: z.boolean() }),
      mode: z.enum(["direct", "inbox"]),
      privacyLevel: z.enum(["", "PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]),
      allowComments: z.boolean(),
      allowDuet: z.boolean(),
      allowStitch: z.boolean(),
      coverTimestampMs: z.number().min(0).max(24 * 3600_000),
      commercialContent: z.boolean(),
      yourBrand: z.boolean(),
      brandedContent: z.boolean(),
      isAigc: z.boolean(),
      autoAddMusic: z.boolean().default(true),
    }),
    instagram: z.object({
      caption: str(5000),
      sync: z.object({ caption: z.boolean() }),
      shareToFeed: z.boolean(),
      thumbOffsetMs: z.number().min(0).max(24 * 3600_000),
      collaborators: z.array(z.string().trim().min(1).max(60)).max(10),
      audioName: str(200),
      locationId: str(50),
    }),
  }),
  scheduledAt: z.number().int().positive().nullable().optional(),
});

export function newPost(input: PostInput, status: PostStatus): Post {
  const now = Date.now();
  const post: Post = {
    id: crypto.randomUUID(),
    status,
    kind: input.kind ?? "video",
    mediaId: input.mediaId,
    imageIds: input.imageIds ?? [],
    common: input.common,
    platforms: input.platforms,
    options: input.options,
    scheduledAt: input.scheduledAt ?? null,
    publications: {},
    createdAt: now,
    updatedAt: now,
  };
  db().update((d) => {
    d.posts.push(post);
  });
  return post;
}

export function updatePost(id: string, input: PostInput, status: PostStatus): Post {
  const existing = getPost(id);
  if (!existing) throw new Error("Publication introuvable.");
  if (existing.status === "publishing") throw new Error("Publication en cours : modification impossible.");
  const updated = db().update((d) => {
    const p = d.posts.find((x) => x.id === id)!;
    Object.assign(p, {
      kind: input.kind ?? "video",
      mediaId: input.mediaId,
      imageIds: input.imageIds ?? [],
      common: input.common,
      platforms: input.platforms,
      options: input.options,
      scheduledAt: input.scheduledAt ?? null,
      status,
      updatedAt: Date.now(),
    });
    return p;
  });
  if (existing.mediaId && existing.mediaId !== input.mediaId) deleteMediaIfUnused(existing.mediaId);
  for (const img of existing.imageIds ?? []) if (!input.imageIds?.includes(img)) deleteMediaIfUnused(img);
  const oldThumb = existing.options.youtube.thumbnailId;
  if (oldThumb && oldThumb !== input.options.youtube.thumbnailId) deleteMediaIfUnused(oldThumb);
  return updated;
}

export function deletePost(id: string) {
  const post = getPost(id);
  if (!post) return;
  db().update((d) => {
    d.posts = d.posts.filter((p) => p.id !== id);
  });
  deleteMediaIfUnused(post.mediaId);
  deleteMediaIfUnused(post.options.youtube.thumbnailId);
  for (const img of post.imageIds ?? []) deleteMediaIfUnused(img);
}

export function duplicatePost(id: string): Post {
  const post = getPost(id);
  if (!post) throw new Error("Publication introuvable.");
  return newPost(
    {
      kind: post.kind ?? "video",
      mediaId: post.mediaId,
      imageIds: post.imageIds ?? [],
      common: post.common,
      platforms: post.platforms,
      options: { ...defaultOptions(getSettings().defaults), ...post.options },
      scheduledAt: null,
    },
    "draft",
  );
}

export function listPosts(): Post[] {
  return db()
    .read((d) => d.posts)
    .sort((a, b) => (b.scheduledAt ?? b.publishedAt ?? b.updatedAt) - (a.scheduledAt ?? a.publishedAt ?? a.updatedAt));
}
