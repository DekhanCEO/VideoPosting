"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Clock, Copy, ExternalLink, Eye, Film, Images, Loader2, MoreHorizontal, Pencil, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { formatCompact, formatDateTime, formatRelative } from "@/lib/format";
import { PLATFORMS } from "@/lib/platforms";
import type { PlatformId, PostWithMedia, Publication } from "@/lib/types";
import { mediaUrl } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "../icons";
import { PostStatusBadge } from "../status";
import { Menu, buttonClass } from "../ui";

export function postTitle(post: PostWithMedia) {
  return post.common.title || post.options.youtube.title || post.common.description.slice(0, 60) || "Sans titre";
}

export function postHref(post: PostWithMedia) {
  return post.status === "draft" || post.status === "scheduled" ? `/compose?id=${post.id}` : `/post?id=${post.id}`;
}

export function Thumb({ post, className }: { post: PostWithMedia; className?: string }) {
  const photos = post.kind === "photo" ? (post.images ?? []) : [];
  const poster = photos[0]?.id ?? post.media?.posterId;
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-surface-3 to-surface-2", className)}>
      {photos.length > 1 && (
        <span className="absolute top-1 right-1 z-[1] flex items-center gap-0.5 rounded-md bg-black/60 px-1 py-0.5 text-[9px] font-semibold text-white">
          <Images className="size-2.5" />
          {photos.length}
        </span>
      )}
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaUrl(poster)} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center text-subtle">
          <Film className="size-5" />
        </div>
      )}
    </div>
  );
}

/** Pastille d'état d'une plateforme pour une publication. */
export function PlatformStatusChip({ platform, pub, size = 26 }: { platform: PlatformId; pub?: Publication; size?: number }) {
  const status = pub?.status;
  const overlay =
    status === "published" ? (
      <CheckCircle2 className="size-3.5 text-success" />
    ) : status === "failed" ? (
      <XCircle className="size-3.5 text-danger" />
    ) : status === "canceled" ? (
      <Ban className="size-3.5 text-warning" />
    ) : status === "uploading" || status === "processing" || status === "pending" ? (
      <Loader2 className="size-3.5 animate-spin text-accent" />
    ) : null;
  const title = `${PLATFORMS[platform].name}${pub ? ` · ${pub.step ?? pub.status}` : ""}${pub?.error ? ` — ${pub.error}` : ""}`;
  const chip = (
    <span className="relative inline-flex" title={title}>
      <PlatformBadge platform={platform} size={size} className={cn(!pub && "opacity-90", status === "failed" && "opacity-60")} />
      {overlay && <span className="absolute -right-1 -bottom-1 rounded-full bg-surface p-px">{overlay}</span>}
    </span>
  );
  if (pub?.url && status === "published") {
    return (
      <a href={pub.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="transition-transform hover:scale-110">
        {chip}
      </a>
    );
  }
  return chip;
}

export function PostActions({ post, onChange, align = "end" }: { post: PostWithMedia; onChange?: () => void; align?: "start" | "end" }) {
  const router = useRouter();
  const editable = post.status !== "publishing";
  const remove = async () => {
    if (!confirm("Supprimer cette publication ? Les vidéos déjà en ligne ne seront pas supprimées des plateformes.")) return;
    await api(`/api/posts/${post.id}`, { method: "DELETE" });
    toast.success("Publication supprimée");
    onChange?.();
  };
  const duplicate = async () => {
    const copy = await api<PostWithMedia>(`/api/posts/${post.id}/duplicate`, { method: "POST" });
    toast.success("Publication dupliquée en brouillon");
    router.push(`/compose?id=${copy.id}`);
  };
  return (
    <Menu
      align={align}
      trigger={(p) => (
        <button {...p} onClick={(e) => (e.stopPropagation(), e.preventDefault(), p.onClick())} className={buttonClass("ghost", "icon-sm")} aria-label="Actions">
          <MoreHorizontal className="size-4" />
        </button>
      )}
      items={[
        { label: "Voir le suivi", icon: <Eye />, onClick: () => router.push(`/post?id=${post.id}`) },
        { label: "Modifier", icon: <Pencil />, onClick: () => router.push(`/compose?id=${post.id}`), disabled: !editable },
        { label: "Dupliquer", icon: <Copy />, onClick: duplicate },
        "separator",
        { label: "Supprimer", icon: <Trash2 />, onClick: remove, danger: true, disabled: !editable },
      ]}
    />
  );
}

export function PostRow({ post, onChange }: { post: PostWithMedia; onChange?: () => void }) {
  const active = post.platforms.map((p) => post.publications[p]).filter((p) => p && ["pending", "uploading", "processing"].includes(p.status));
  const progress = active.length ? Math.round(active.reduce((n, p) => n + (p?.progress ?? 0), 0) / active.length) : null;
  const views = post.platforms.reduce((n, p) => n + (post.publications[p]?.metrics?.views ?? 0), 0);
  const date =
    post.status === "scheduled" && post.scheduledAt ? (
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3" /> {formatDateTime(post.scheduledAt)}
      </span>
    ) : post.publishedAt ? (
      `Publiée ${formatRelative(post.publishedAt)}`
    ) : (
      `Modifiée ${formatRelative(post.updatedAt)}`
    );

  return (
    <Link
      href={postHref(post)}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 pr-4 shadow-card transition-all hover:-translate-y-px hover:border-border-strong hover:shadow-pop"
    >
      <Thumb post={post} className="h-20 w-[45px] sm:h-24 sm:w-[54px]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <PostStatusBadge status={post.status} />
          <span className="text-xs text-muted">{date}</span>
        </div>
        <p className="mt-1.5 truncate font-medium group-hover:text-accent">{postTitle(post)}</p>
        <div className="mt-2 flex items-center gap-2.5">
          {post.platforms.map((p) => (
            <PlatformStatusChip key={p} platform={p} pub={post.publications[p]} size={22} />
          ))}
          {progress !== null && <span className="text-xs font-medium text-accent tabular-nums">{progress}%</span>}
          {views > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 text-xs text-muted">
              <Eye className="size-3" /> {formatCompact(views)} vues
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {post.platforms.some((p) => post.publications[p]?.url) && (
          <span className="hidden text-subtle sm:block">
            <ExternalLink className="size-4" />
          </span>
        )}
        <PostActions post={post} onChange={onChange} />
      </div>
    </Link>
  );
}
