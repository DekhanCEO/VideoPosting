"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Pencil,
  RotateCcw,
  Share2,
  Square,
  Trash2,
  PartyPopper,
  Bookmark,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { resolveOptions } from "@/lib/captions";
import { formatCompact, formatDateTime, formatRelative, formatTime } from "@/lib/format";
import { usePost } from "@/lib/hooks";
import { PLATFORMS, TIKTOK_PRIVACY_LABELS, YOUTUBE_PRIVACY_LABELS, contentLabel } from "@/lib/platforms";
import type { MediaAsset, PlatformId, PostWithMedia, Publication } from "@/lib/types";
import { mediaUrl } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { PageContainer } from "../app-shell";
import { PlatformBadge } from "../icons";
import { PostStatusBadge, PublicationStatusBadge } from "../status";
import { Badge, Button, ButtonLink, Card, Progress, Skeleton } from "../ui";
import { postTitle } from "./post-bits";

function Metric({ icon, value, label }: { icon: React.ReactNode; value?: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{formatCompact(value ?? 0)}</p>
    </div>
  );
}

function PublicationCard({
  post,
  platform,
  pub,
  onRetry,
  onCancel,
}: {
  post: PostWithMedia;
  platform: PlatformId;
  pub?: Publication;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const [logsOpen, setLogsOpen] = useState(false);
  const status = pub?.status;
  const running = status === "pending" || status === "uploading" || status === "processing";
  const resolved = resolveOptions(post.common, post.options);
  const kind = post.kind ?? "video";
  const type = contentLabel(platform, kind, { media: post.media, imageCount: post.images?.length ?? 0, youtubeFormat: post.options.youtube.format });
  const meta = [
    type,
    platform === "youtube"
      ? YOUTUBE_PRIVACY_LABELS[resolved.youtube.privacy].label
      : platform === "tiktok"
        ? resolved.tiktok.mode === "inbox"
          ? "Brouillon (boîte de réception)"
          : resolved.tiktok.privacyLevel
            ? TIKTOK_PRIVACY_LABELS[resolved.tiktok.privacyLevel]
            : ""
        : kind === "video" && resolved.instagram.shareToFeed
          ? "partagé dans le fil"
          : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className={cn("overflow-hidden transition-colors", status === "failed" && "border-danger/40", status === "published" && "border-success/30")}>
      <div className="flex items-center gap-3 p-4">
        <PlatformBadge platform={platform} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{PLATFORMS[platform].name}</p>
            {pub?.demo && <Badge tone="warning">Démo</Badge>}
          </div>
          <p className="truncate text-xs text-muted">{meta}</p>
        </div>
        {pub ? <PublicationStatusBadge status={pub.status} /> : post.status === "scheduled" ? <Badge tone="info">Programmée</Badge> : <Badge>Non publiée</Badge>}
      </div>

      {pub && (
        <div className="space-y-3 border-t border-border px-4 py-4">
          {running && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">{pub.step ?? "En cours"}</span>
                <span className="font-semibold tabular-nums">{pub.progress}%</span>
              </div>
              <Progress value={pub.progress} />
            </div>
          )}

          {status === "failed" && pub.error && (
            <div className="flex gap-2.5 rounded-xl bg-danger/8 p-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{pub.error}</span>
            </div>
          )}
          {status === "canceled" && <p className="text-sm text-muted">Publication annulée.</p>}

          {status === "published" && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-success" />
                <span>Publiée {formatRelative(pub.finishedAt)}</span>
                {pub.url ? (
                  <a href={pub.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 font-medium text-accent hover:underline">
                    Voir sur {PLATFORMS[platform].name} <ExternalLink className="size-3.5" />
                  </a>
                ) : pub.demo ? (
                  <span className="ml-auto text-xs text-subtle">Lien indisponible en mode démo</span>
                ) : null}
              </div>
              {pub.metrics && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Metric icon={<Eye className="size-3.5" />} value={pub.metrics.views} label="Vues" />
                  <Metric icon={<Heart className="size-3.5" />} value={pub.metrics.likes} label="J'aime" />
                  <Metric icon={<MessageCircle className="size-3.5" />} value={pub.metrics.comments} label="Comment." />
                  {platform === "instagram" && pub.metrics.saves !== undefined ? (
                    <Metric icon={<Bookmark className="size-3.5" />} value={pub.metrics.saves} label="Enreg." />
                  ) : (
                    <Metric icon={<Share2 className="size-3.5" />} value={pub.metrics.shares} label="Partages" />
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {(status === "failed" || status === "canceled") && (
              <Button size="sm" variant="soft" onClick={onRetry}>
                <RotateCcw className="size-4" /> Réessayer
              </Button>
            )}
            {running && (
              <Button size="sm" variant="ghost" onClick={onCancel}>
                <Square className="size-3.5" /> Annuler
              </Button>
            )}
            {pub.logs.length > 0 && (
              <button onClick={() => setLogsOpen((o) => !o)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                {logsOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} Journal ({pub.logs.length})
              </button>
            )}
          </div>

          {logsOpen && (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-surface-2 p-3 font-mono text-[11px] scrollbar-thin">
              {pub.logs.map((l, i) => (
                <div key={i} className={cn("flex gap-2", l.level === "error" && "text-danger", l.level === "warn" && "text-warning")}>
                  <span className="shrink-0 text-subtle">{formatTime(l.at)}</span>
                  <span>{l.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function PostDetail({ id }: { id: string }) {
  const router = useRouter();
  const { data: post, error, mutate } = usePost(id);
  const [textTab, setTextTab] = useState<PlatformId | null>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    if (!post) return;
    if (post.status === "publishing") wasActive.current = true;
    else if (wasActive.current) {
      wasActive.current = false;
      if (post.status === "published") toast.success(post.kind === "photo" ? "Vos photos sont en ligne partout 🎉" : "Votre vidéo est en ligne partout 🎉");
      else if (post.status === "partial") toast.warning("Publiée sur une partie des plateformes");
      else if (post.status === "failed") toast.error("La publication a échoué");
    }
  }, [post]);

  if (error) {
    return (
      <PageContainer>
        <Card className="p-10 text-center">
          <p className="font-medium">Publication introuvable</p>
          <ButtonLink href="/posts" className="mt-4">
            Retour aux publications
          </ButtonLink>
        </Card>
      </PageContainer>
    );
  }
  if (!post) {
    return (
      <PageContainer>
        <Skeleton className="h-9 w-80" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
          <Skeleton className="h-[520px]" />
          <div className="space-y-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        </div>
      </PageContainer>
    );
  }

  const act = async (path: string, body?: unknown, success?: string) => {
    try {
      await api(`/api/posts/${id}/${path}`, { method: "POST", json: body ?? {} });
      if (success) toast.success(success);
      void mutate();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const remove = async () => {
    if (!confirm("Supprimer cette publication ? Les vidéos déjà en ligne restent sur les plateformes.")) return;
    await api(`/api/posts/${id}`, { method: "DELETE" });
    toast.success("Publication supprimée");
    router.push("/posts");
  };

  const duplicate = async () => {
    const copy = await api<PostWithMedia>(`/api/posts/${id}/duplicate`, { method: "POST" });
    router.push(`/compose?id=${copy.id}`);
  };

  const failed = post.platforms.filter((p) => ["failed", "canceled"].includes(post.publications[p]?.status ?? ""));
  const vertical = (post.media?.height ?? 1) >= (post.media?.width ?? 0);
  const resolved = resolveOptions(post.common, post.options);
  const currentText = textTab ?? post.platforms[0];
  const overall =
    post.status === "publishing"
      ? Math.round(post.platforms.reduce((n, p) => n + (post.publications[p]?.progress ?? 0), 0) / Math.max(1, post.platforms.length))
      : null;

  return (
    <PageContainer>
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/posts" className="hover:text-fg">
          Publications
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="truncate">{postTitle(post)}</span>
      </div>
      <div className="mt-1 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-[28px]">{postTitle(post)}</h1>
          <PostStatusBadge status={post.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {failed.length > 0 && post.status !== "publishing" && (
            <Button variant="primary" onClick={() => act("publish", { platforms: failed }, "Nouvelle tentative lancée")}>
              <RotateCcw className="size-4" /> Relancer {failed.length > 1 ? `les ${failed.length} échecs` : "l'échec"}
            </Button>
          )}
          {post.status === "scheduled" && (
            <Button onClick={() => act("cancel", {}, "Programmation annulée : la publication est repassée en brouillon")}>
              <CalendarClock className="size-4" /> Déprogrammer
            </Button>
          )}
          {post.status !== "publishing" && post.status !== "published" && (
            <ButtonLink href={`/compose?id=${post.id}`}>
              <Pencil className="size-4" /> Modifier
            </ButtonLink>
          )}
          <Button onClick={duplicate}>
            <Copy className="size-4" /> Dupliquer
          </Button>
          <Button variant="ghost" size="icon" onClick={remove} disabled={post.status === "publishing"} aria-label="Supprimer">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {post.status === "published" && (
        <div className="mt-6 flex animate-slide-up items-center gap-3 rounded-2xl border border-success/30 bg-success/8 px-4 py-3 text-sm">
          <PartyPopper className="size-5 animate-pop text-success" />
          <span>
            <strong>Bravo !</strong> {post.kind === "photo" ? "Vos photos sont en ligne" : "Votre vidéo est en ligne"} sur {post.platforms.length > 1 ? `les ${post.platforms.length} plateformes` : PLATFORMS[post.platforms[0]].name}.
          </span>
        </div>
      )}
      {post.status === "scheduled" && post.scheduledAt && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/8 px-4 py-3 text-sm">
          <CalendarClock className="size-5 text-sky-500" />
          <span>
            Publication programmée le <strong>{formatDateTime(post.scheduledAt)}</strong> ({formatRelative(post.scheduledAt)}).
          </span>
        </div>
      )}
      {overall !== null && (
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent-soft p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Publication en cours…</span>
            <span className="font-semibold tabular-nums">{overall}%</span>
          </div>
          <Progress value={overall} className="mt-2 h-2" />
          <p className="mt-2 text-xs text-muted">Vous pouvez quitter cette page : l&apos;envoi continue sur le serveur.</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="overflow-hidden p-3">
            {post.kind === "photo" ? (
              <PhotoGallery images={post.images ?? []} />
            ) : (
            <div className={cn("overflow-hidden rounded-xl bg-black", vertical ? "aspect-[9/16]" : "aspect-video")}>
              {post.media ? (
                <video
                  src={mediaUrl(post.media.id)}
                  poster={post.media.posterId ? mediaUrl(post.media.posterId) : undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="size-full object-contain"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-white/50">Aucune vidéo</div>
              )}
            </div>
            )}
          </Card>
          <Card className="space-y-2 p-4 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted">Créée</span>
              <span>{formatDateTime(post.createdAt)}</span>
            </div>
            {post.scheduledAt && (
              <div className="flex justify-between gap-2">
                <span className="text-muted">Programmée</span>
                <span>{formatDateTime(post.scheduledAt)}</span>
              </div>
            )}
            {post.publishedAt && (
              <div className="flex justify-between gap-2">
                <span className="text-muted">Publiée</span>
                <span>{formatDateTime(post.publishedAt)}</span>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {post.platforms.map((p) => (
            <PublicationCard
              key={p}
              post={post}
              platform={p}
              pub={post.publications[p]}
              onRetry={() => act("publish", { platforms: [p] }, `Nouvelle tentative sur ${PLATFORMS[p].name}`)}
              onCancel={() => act("cancel", { platform: p }, "Annulation demandée")}
            />
          ))}

          <Card>
            <div className="flex gap-1 border-b border-border px-3 pt-3">
              {post.platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setTextTab(p)}
                  className={cn("relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium", currentText === p ? "text-fg" : "text-muted hover:text-fg")}
                >
                  <PlatformBadge platform={p} size={18} /> {PLATFORMS[p].name}
                  {currentText === p && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full gradient-brand" />}
                </button>
              ))}
            </div>
            <div className="space-y-3 p-5 text-sm">
              {currentText === "youtube" && (
                <>
                  <p className="text-base font-semibold">{resolved.youtube.title || "—"}</p>
                  <p className="whitespace-pre-line text-muted">{resolved.youtube.description || "Pas de description"}</p>
                  {resolved.youtube.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {resolved.youtube.tags.map((t) => (
                        <Badge key={t}>{t}</Badge>
                      ))}
                    </div>
                  )}
                </>
              )}
              {currentText === "tiktok" && <p className="whitespace-pre-line">{resolved.tiktok.caption || "Pas de légende"}</p>}
              {currentText === "instagram" && <p className="whitespace-pre-line">{resolved.instagram.caption || "Pas de légende"}</p>}
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}

/** Photos d'une publication photo : image principale et vignettes. */
function PhotoGallery({ images }: { images: MediaAsset[] }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  if (!current) return <div className="flex aspect-[4/5] items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">Aucune photo</div>;
  return (
    <div className="space-y-2">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(current.id)} alt={`Photo ${index + 1}`} className="size-full object-contain" />
        {images.length > 1 && (
          <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
            {index + 1}/{images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {images.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn("size-12 shrink-0 overflow-hidden rounded-lg border-2", i === index ? "border-accent" : "border-transparent opacity-70 hover:opacity-100")}
              aria-label={`Afficher la photo ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(m.id)} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
