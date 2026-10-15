"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  AlertCircle,
  AlertTriangle,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Eye,
  Film,
  Images,
  Save,
  Send,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ApiError, api, fetcher } from "@/lib/api-client";
import { defaultOptions, resolveOptions } from "@/lib/captions";
import { formatDateTime, formatRelative, fromLocalInput, toLocalInput } from "@/lib/format";
import { useAccounts, useDiscordWebhooks, useSettings } from "@/lib/hooks";
import { PLATFORMS, PLATFORM_ORDER, TIKTOK_PRIVACY_LABELS, YOUTUBE_PRIVACY_LABELS, contentLabel, supportsKind, youtubeIsShort } from "@/lib/platforms";
import type {
  CommonContent,
  MediaAsset,
  PlatformId,
  PlatformOptionsMap,
  PostInput,
  PostKind,
  PostWithMedia,
  PublicAccount,
  SaveAction,
  TiktokCreatorInfo,
} from "@/lib/types";
import { mediaUrl } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { validatePost, type Issue } from "@/lib/validation";
import { PageContainer } from "../app-shell";
import { ComposerDiscordCard } from "../discord-settings";
import { DiscordBadge, PlatformBadge } from "../icons";
import { PostStatusBadge } from "../status";
import { Avatar, Badge, Button, Card, CardHeader, Dialog, Field, Input, Segmented, Skeleton, Textarea } from "../ui";
import { ChipsInput } from "./fields";
import { CaptionSourceHint, InstagramPanel, TiktokPanel, YoutubePanel } from "./platform-panels";
import { PhotoUploader } from "./photo-uploader";
import { PlatformPreview, type PreviewData } from "./previews";
import { VideoUploader, type UploadState } from "./video-uploader";

interface Draft {
  kind: PostKind;
  media: MediaAsset | null;
  images: MediaAsset[];
  common: CommonContent;
  platforms: PlatformId[];
  options: PlatformOptionsMap;
  scheduleMode: "now" | "later";
  scheduledAt: number | null;
  /** Salons Discord à prévenir : null = tous les webhooks actifs. */
  discordWebhookIds: string[] | null;
}

function snapshot(d: Draft) {
  return JSON.stringify({
    k: d.kind,
    m: d.media?.id,
    i: d.images.map((x) => x.id),
    c: d.common,
    p: d.platforms,
    o: d.options,
    s: d.scheduleMode === "later" ? d.scheduledAt : null,
    d: d.discordWebhookIds,
  });
}

function nextAt(hour: number, dayOffset = 0, weekday?: number) {
  const d = new Date();
  d.setSeconds(0, 0);
  if (weekday !== undefined) {
    const diff = (weekday - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
  } else {
    d.setDate(d.getDate() + dayOffset);
  }
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() < Date.now() + 5 * 60_000) d.setDate(d.getDate() + 1);
  return d.getTime();
}

const QUICK_SLOTS = [
  { label: "Ce soir 19:00", at: () => nextAt(19) },
  { label: "Demain 12:00", at: () => nextAt(12, 1) },
  { label: "Demain 18:00", at: () => nextAt(18, 1) },
  { label: "Samedi 10:00", at: () => nextAt(10, 0, 6) },
];

export function Composer({ postId, presetDate }: { postId?: string; presetDate?: string }) {
  const router = useRouter();
  const { data: settings } = useSettings();
  const { data: accounts } = useAccounts();
  const { data: existing, error: loadError } = useSWR<PostWithMedia>(postId ? `/api/posts/${postId}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  const [id, setId] = useState<string | undefined>(postId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [tab, setTab] = useState<PlatformId>("tiktok");
  const [previewPlatform, setPreviewPlatform] = useState<PlatformId>("tiktok");
  const [showErrors, setShowErrors] = useState(false);
  const [confirm, setConfirm] = useState<null | "publish" | "schedule">(null);
  const [busy, setBusy] = useState<SaveAction | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const checklistRef = useRef<HTMLDivElement>(null);

  // Initialisation : nouvelle publication ou chargement d'une existante.
  useEffect(() => {
    if (draft || !settings) return;
    if (postId && !existing) return;
    if (existing) {
      const d: Draft = {
        kind: existing.kind ?? "video",
        media: existing.media ?? null,
        images: existing.images ?? [],
        common: existing.common,
        platforms: existing.platforms,
        options: { ...defaultOptions(settings.defaults), ...existing.options },
        scheduleMode: existing.scheduledAt ? "later" : "now",
        scheduledAt: existing.scheduledAt ?? null,
        discordWebhookIds: existing.discordWebhookIds ?? null,
      };
      setDraft(d);
      setSaved(snapshot(d));
      if (d.platforms[0]) {
        setTab(d.platforms[0]);
        setPreviewPlatform(d.platforms[0]);
      }
    } else {
      const d: Draft = {
        kind: "video",
        media: null,
        images: [],
        common: { title: "", description: "", hashtags: [] },
        platforms: [...PLATFORM_ORDER],
        options: defaultOptions(settings.defaults),
        scheduleMode: "now",
        scheduledAt: null,
        discordWebhookIds: null,
      };
      if (presetDate) {
        // Depuis le calendrier : programmation pré-remplie à 18 h ce jour-là.
        const [y, m, day] = presetDate.split("-").map(Number);
        const at = new Date(y, m - 1, day, 18, 0, 0, 0).getTime();
        if (at > Date.now()) {
          d.scheduleMode = "later";
          d.scheduledAt = at;
        }
      }
      setDraft(d);
      setSaved(snapshot(d));
    }
  }, [settings, existing, postId, draft, presetDate]);

  const dirty = !!draft && snapshot(draft) !== saved;

  useEffect(() => {
    if (!dirty && !upload) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, upload]);

  const accountBy = useMemo(() => {
    const map: Partial<Record<PlatformId, PublicAccount>> = {};
    for (const a of accounts ?? []) map[a.platform] = a;
    return map;
  }, [accounts]);

  const { data: discordHooks } = useDiscordWebhooks();
  const discordTargets = (discordHooks ?? []).filter(
    (h) =>
      h.enabled &&
      (draft?.discordWebhookIds == null || draft.discordWebhookIds.includes(h.id)) &&
      h.platforms.some((p) => draft?.platforms.includes(p)) &&
      !settings?.demoMode,
  );

  const wantsTiktok = !!draft?.platforms.includes("tiktok") && !!accountBy.tiktok;
  const { data: creator, error: creatorError } = useSWR<TiktokCreatorInfo>(wantsTiktok ? "/api/platforms/tiktok/creator-info" : null, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });

  const input: PostInput | null = draft
    ? {
        kind: draft.kind,
        mediaId: draft.kind === "video" ? draft.media?.id : undefined,
        imageIds: draft.kind === "photo" ? draft.images.map((m) => m.id) : [],
        common: draft.common,
        platforms: draft.platforms,
        options: draft.options,
        scheduledAt: draft.scheduleMode === "later" ? draft.scheduledAt : null,
        discordWebhookIds: draft.discordWebhookIds,
      }
    : null;

  const issues: Issue[] = useMemo(() => {
    if (!input || !draft) return [];
    const connected = Object.fromEntries(Object.entries(accountBy).map(([k, a]) => [k, !a!.needsReconnect]));
    const list = validatePost({ input, media: draft.media ?? undefined, images: draft.images, connected, tiktokCreator: creator, mode: "publish" });
    if (draft.kind === "video" && upload && !upload.error)
      list.unshift({ platform: "general", level: "error", message: "La vidéo est encore en cours d'envoi.", field: "media" });
    if (draft.kind === "photo" && photosBusy) list.unshift({ platform: "general", level: "error", message: "Des photos sont encore en cours d'envoi.", field: "media" });
    if (draft.scheduleMode === "later" && !draft.scheduledAt)
      list.push({ platform: "general", level: "error", message: "Choisissez la date et l'heure de publication.", field: "schedule" });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(input), draft?.media, draft?.images, accountBy, creator, upload, photosBusy]);

  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const visibleIssues = showErrors ? issues : [];

  const update = useCallback((fn: (d: Draft) => Draft) => setDraft((d) => (d ? fn(d) : d)), []);
  const setCommon = (patch: Partial<CommonContent>) => update((d) => ({ ...d, common: { ...d.common, ...patch } }));
  function setOptions<P extends PlatformId>(platform: P, patch: Partial<PlatformOptionsMap[P]>) {
    update((d) => ({ ...d, options: { ...d.options, [platform]: { ...d.options[platform], ...patch } } }));
  }

  const togglePlatform = (p: PlatformId) => {
    if (draft && !supportsKind(p, draft.kind)) {
      toast.info(`${PLATFORMS[p].name} n'accepte que des vidéos.`);
      return;
    }
    update((d) => {
      const platforms = d.platforms.includes(p) ? d.platforms.filter((x) => x !== p) : PLATFORM_ORDER.filter((x) => x === p || d.platforms.includes(x));
      return { ...d, platforms };
    });
  };

  // Vidéo ↔ photos : YouTube (vidéo uniquement) est retiré puis remis automatiquement.
  const youtubeRemovedBySwitch = useRef(false);
  const setKind = (kind: PostKind) =>
    update((d) => {
      if (d.kind === kind) return d;
      let platforms = d.platforms;
      if (kind === "photo" && platforms.includes("youtube")) {
        platforms = platforms.filter((x) => x !== "youtube");
        youtubeRemovedBySwitch.current = true;
        toast.info("YouTube retiré : il n'accepte que des vidéos.");
      } else if (kind === "video" && youtubeRemovedBySwitch.current) {
        platforms = PLATFORM_ORDER.filter((x) => x === "youtube" || platforms.includes(x));
        youtubeRemovedBySwitch.current = false;
      }
      return { ...d, kind, platforms };
    });

  useEffect(() => {
    if (!draft) return;
    if (!draft.platforms.includes(tab) && draft.platforms[0]) setTab(draft.platforms[0]);
    if (!draft.platforms.includes(previewPlatform) && draft.platforms[0]) setPreviewPlatform(draft.platforms[0]);
  }, [draft, tab, previewPlatform]);

  const save = async (action: SaveAction): Promise<PostWithMedia | null> => {
    if (!input) return null;
    setBusy(action);
    try {
      const post = await api<PostWithMedia>(id ? `/api/posts/${id}` : "/api/posts", {
        method: id ? "PUT" : "POST",
        json: { input, action },
      });
      setId(post.id);
      setSaved(snapshot(draft!));
      return post;
    } catch (err) {
      const e = err as ApiError;
      toast.error(action === "draft" ? "Enregistrement impossible" : "Publication impossible", { description: e.message });
      return null;
    } finally {
      setBusy(null);
    }
  };

  const saveDraft = async () => {
    const post = await save("draft");
    if (post) {
      toast.success("Brouillon enregistré");
    }
  };

  const requestSubmit = () => {
    setShowErrors(true);
    if (errors.length) {
      toast.error("Quelques éléments à corriger", { description: errors[0].message });
      checklistRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      const firstPlatformError = errors.find((e) => e.platform !== "general");
      if (firstPlatformError && firstPlatformError.platform !== "general") setTab(firstPlatformError.platform);
      return;
    }
    setConfirm(draft!.scheduleMode === "later" ? "schedule" : "publish");
  };

  const doSubmit = async () => {
    const action = confirm!;
    const post = await save(action);
    setConfirm(null);
    if (!post) return;
    if (action === "schedule") {
      toast.success("Publication programmée", { description: formatDateTime(post.scheduledAt) });
    } else {
      toast.success("Publication lancée 🚀");
    }
    router.push(`/post?id=${post.id}`);
  };

  if (loadError) {
    return (
      <PageContainer>
        <Card className="p-10 text-center text-sm text-muted">Publication introuvable.</Card>
      </PageContainer>
    );
  }

  if (!draft || !settings) {
    return (
      <PageContainer wide>
        <Skeleton className="h-9 w-72" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-40" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-[600px]" />
        </div>
      </PageContainer>
    );
  }

  const media = draft.media;
  const photo = draft.kind === "photo";
  const resolved = resolveOptions(draft.common, draft.options);
  const ytFormat = draft.options.youtube.format ?? "auto";
  const label = (p: PlatformId) => contentLabel(p, draft.kind, { media, imageCount: draft.images.length, youtubeFormat: ytFormat });
  const scheduled = draft.scheduleMode === "later";
  const readOnly = existing?.status === "publishing";

  const previewData = (platform: PlatformId): PreviewData => {
    const acc = accountBy[platform];
    const fallbackName = settings.demoMode ? "Léa Créations" : "Votre compte";
    const caption = platform === "youtube" ? resolved.youtube.description : platform === "tiktok" ? resolved.tiktok.caption : resolved.instagram.caption;
    return {
      kind: draft.kind,
      images: draft.images.map((m) => mediaUrl(m.id)),
      videoSrc: media ? mediaUrl(media.id) : upload?.localUrl,
      posterSrc: media?.posterId ? mediaUrl(media.posterId) : undefined,
      name: acc?.name ?? fallbackName,
      username: (acc?.username ?? (platform === "tiktok" ? creator?.creatorUsername : undefined) ?? "votre_compte").replace(/^@/, platform === "youtube" ? "@" : ""),
      avatarUrl: acc?.avatarUrl ?? (platform === "tiktok" ? creator?.creatorAvatarUrl : undefined),
      caption,
      title: resolved.youtube.title,
      isShort: youtubeIsShort(ytFormat, media ?? undefined) || (ytFormat === "auto" && !media),
      vertical: media ? (media.height ?? 0) >= (media.width ?? 0) : true,
      duration: media?.duration,
      collaborators: resolved.instagram.collaborators,
      audioName: resolved.instagram.audioName,
      brandLabel:
        platform === "tiktok" && resolved.tiktok.commercialContent
          ? resolved.tiktok.brandedContent
            ? "Partenariat rémunéré"
            : resolved.tiktok.yourBrand
              ? "Contenu promotionnel"
              : null
          : null,
    };
  };

  const previewPanel = (
    <div className="space-y-4">
      {draft.platforms.length > 0 ? (
        <>
          <Segmented
            className="w-full"
            value={previewPlatform}
            onChange={setPreviewPlatform}
            options={draft.platforms.map((p) => ({ value: p, label: PLATFORMS[p].name, icon: <PlatformBadge platform={p} size={16} /> }))}
          />
          <PlatformPreview platform={previewPlatform} data={previewData(previewPlatform)} />
          <p className="text-center text-xs text-subtle">Aperçu indicatif · le rendu final dépend de chaque application</p>
        </>
      ) : (
        <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted">
          <Smartphone className="size-6" /> Sélectionnez une plateforme
        </div>
      )}
    </div>
  );

  const wasScheduled = existing?.status === "scheduled";
  const primaryLabel = scheduled ? (wasScheduled ? "Mettre à jour" : "Programmer") : "Publier maintenant";
  const draftLabel = wasScheduled ? "Repasser en brouillon" : "Enregistrer le brouillon";

  return (
    <PageContainer wide className="pb-28 lg:pb-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link href="/posts" className="hover:text-fg">
              Publications
            </Link>
            <ChevronRight className="size-3.5" />
            <span>{id ? "Modifier" : "Nouvelle"}</span>
          </div>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{id ? "Modifier la publication" : "Nouvelle publication"}</h1>
            {existing && <PostStatusBadge status={existing.status} />}
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {dirty && <span className="mr-1 text-xs text-subtle">Modifications non enregistrées</span>}
          <Button onClick={saveDraft} loading={busy === "draft"} disabled={readOnly}>
            <Save className="size-4" /> {draftLabel}
          </Button>
          <Button variant="primary" onClick={requestSubmit} disabled={readOnly || !!busy}>
            {scheduled ? <CalendarClock className="size-4" /> : <Send className="size-4" />}
            {primaryLabel}
          </Button>
        </div>
      </div>

      {readOnly && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
          <Zap className="size-4 text-accent" /> Cette publication est en cours d&apos;envoi.
          <Link href={`/post?id=${id}`} className="font-medium text-accent hover:underline">
            Suivre la progression →
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-6">
          {/* 1. Média : vidéo, ou photos (publication / carrousel) */}
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              value={draft.kind}
              onChange={(v) => setKind(v as PostKind)}
              options={[
                { value: "video", label: "Vidéo", icon: <Film className="size-4" /> },
                { value: "photo", label: "Photos", icon: <Images className="size-4" /> },
              ]}
            />
            <span className="text-xs text-muted">
              {photo ? "Publication ou carrousel Instagram, diaporama TikTok." : "Short ou vidéo longue YouTube, Reel Instagram, vidéo TikTok."}
            </span>
          </div>
          {photo ? (
            <PhotoUploader
              images={draft.images}
              onChange={(fn) => update((d) => ({ ...d, images: fn(d.images) }))}
              onBusyChange={setPhotosBusy}
              instagram={draft.platforms.includes("instagram")}
              canDeleteFromServer={!id}
            />
          ) : (
          <VideoUploader
            media={media}
            upload={upload}
            onUploadStart={(u) => setUpload(u)}
            onUploadProgress={(p) => setUpload((u) => (u ? { ...u, progress: p } : u))}
            onUploaded={(m) => {
              setUpload((u) => {
                if (u) URL.revokeObjectURL(u.localUrl);
                return null;
              });
              update((d) => ({ ...d, media: m }));
            }}
            onUploadError={(message) => setUpload((u) => (message && u ? { ...u, error: message } : null))}
            onRemove={() => {
              const old = media?.id;
              update((d) => ({ ...d, media: null }));
              if (old && !id) void api(`/api/media/${old}`, { method: "DELETE" }).catch(() => undefined);
            }}
          />
          )}

          {/* 2. Plateformes */}
          <Card>
            <CardHeader title="Plateformes" description={photo ? "Choisissez où publier ces photos." : "Choisissez où publier cette vidéo."} />
            <div className="grid gap-3 p-5 sm:grid-cols-3">
              {PLATFORM_ORDER.map((p) => {
                const selected = draft.platforms.includes(p);
                const unsupported = !supportsKind(p, draft.kind);
                const acc = accountBy[p];
                const hasError = showErrors && errors.some((e) => e.platform === p);
                return (
                  <div
                    key={p}
                    role="checkbox"
                    aria-checked={selected}
                    aria-disabled={unsupported}
                    tabIndex={0}
                    onClick={() => togglePlatform(p)}
                    onKeyDown={(e) => (e.key === " " || e.key === "Enter") && (e.preventDefault(), togglePlatform(p))}
                    className={cn(
                      "group relative cursor-pointer rounded-2xl border-2 p-3.5 transition-all select-none sm:p-4",
                      selected ? "border-accent bg-accent-soft/50 shadow-[0_0_0_4px_var(--ring)]" : "border-border hover:border-border-strong",
                      hasError && "border-danger/60",
                      unsupported && "cursor-not-allowed opacity-50 hover:border-border",
                    )}
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <div className="flex items-start justify-between">
                        <PlatformBadge platform={p} size={40} />
                        <span
                          className={cn(
                            "hidden size-5 items-center justify-center rounded-full border-2 transition-all sm:flex",
                            selected ? "border-accent bg-accent text-white" : "border-border-strong",
                          )}
                        >
                          {selected && <Check className="size-3" strokeWidth={3} />}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 sm:mt-3">
                        <p className="font-semibold">{PLATFORMS[p].name}</p>
                        <p className="text-xs text-muted">{label(p)}</p>
                      </div>
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-all sm:hidden",
                          selected ? "border-accent bg-accent text-white" : "border-border-strong",
                        )}
                      >
                        {selected && <Check className="size-3" strokeWidth={3} />}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                      {acc ? (
                        <>
                          <Avatar src={acc.avatarUrl} name={acc.name} size={20} />
                          <span className="min-w-0 truncate text-xs text-muted">{acc.username ? `@${acc.username.replace(/^@/, "")}` : acc.name}</span>
                          {acc.needsReconnect && <AlertTriangle className="size-3.5 shrink-0 text-warning" />}
                        </>
                      ) : (
                        <Link
                          href="/accounts"
                          target="_blank"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Connecter le compte ↗
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* 3. Contenu commun */}
          <Card>
            <CardHeader
              title="Contenu commun"
              description="Écrivez une fois : chaque plateforme reprend ces textes, que vous pouvez ensuite personnaliser."
              icon={<Sparkles className="size-4 text-accent" />}
            />
            <div className="space-y-4 p-5">
              <Field label="Titre" counter={{ value: Array.from(draft.common.title).length, max: 100 }} hint="Titre YouTube et première ligne des légendes TikTok / Instagram.">
                <Input value={draft.common.title} onChange={(e) => setCommon({ title: e.target.value })} placeholder="Ex. Ma routine du matin en 30 secondes ☀️" />
              </Field>
              <Field label="Description">
                <Textarea
                  value={draft.common.description}
                  onChange={(e) => setCommon({ description: e.target.value })}
                  rows={4}
                  placeholder="Racontez ce qui se passe dans la vidéo, ajoutez un appel à l'action…"
                />
              </Field>
              <Field label="Hashtags" hint="Ajoutés à la fin des légendes et utilisés comme tags YouTube.">
                <ChipsInput value={draft.common.hashtags} onChange={(v) => setCommon({ hashtags: v })} placeholder="#hashtag puis Entrée" groups={settings.hashtagGroups} />
              </Field>
              <CaptionSourceHint />
            </div>
          </Card>

          {/* 4. Personnalisation par plateforme */}
          {draft.platforms.length > 0 && (
            <Card>
              <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-3 scrollbar-thin">
                {draft.platforms.map((p) => {
                  const platformErrors = showErrors && errors.some((e) => e.platform === p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setTab(p);
                        setPreviewPlatform(p);
                      }}
                      className={cn(
                        "relative flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-medium transition-colors",
                        tab === p ? "text-fg" : "text-muted hover:text-fg",
                      )}
                    >
                      <PlatformBadge platform={p} size={20} />
                      {PLATFORMS[p].name}
                      {platformErrors && <span className="size-2 rounded-full bg-danger" />}
                      {tab === p && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full gradient-brand" />}
                    </button>
                  );
                })}
              </div>
              <div className="p-5">
                {tab === "youtube" && (
                  <YoutubePanel
                    common={draft.common}
                    value={draft.options.youtube}
                    onChange={(patch) => setOptions("youtube", patch)}
                    media={media}
                    issues={issues.filter((i) => i.platform === "youtube" && (showErrors || i.field === "format"))}
                  />
                )}
                {tab === "tiktok" && (
                  <TiktokPanel
                    common={draft.common}
                    value={draft.options.tiktok}
                    onChange={(patch) => setOptions("tiktok", patch)}
                    media={media}
                    creator={creator}
                    creatorError={creatorError ? (creatorError as Error).message : undefined}
                    account={accountBy.tiktok}
                    issues={visibleIssues.filter((i) => i.platform === "tiktok")}
                    kind={draft.kind}
                    imageCount={draft.images.length}
                  />
                )}
                {tab === "instagram" && (
                  <InstagramPanel
                    common={draft.common}
                    value={draft.options.instagram}
                    onChange={(patch) => setOptions("instagram", patch)}
                    media={media}
                    settings={settings}
                    account={accountBy.instagram}
                    issues={visibleIssues.filter((i) => i.platform === "instagram")}
                    kind={draft.kind}
                    imageCount={draft.images.length}
                  />
                )}
              </div>
            </Card>
          )}

          {/* 5. Planification */}
          <Card>
            <CardHeader title="Quand publier ?" icon={<CalendarClock className="size-4" />} />
            <div className="space-y-4 p-5">
              <Segmented
                value={draft.scheduleMode}
                onChange={(v) =>
                  update((d) => ({ ...d, scheduleMode: v, scheduledAt: v === "later" && !d.scheduledAt ? QUICK_SLOTS[0].at() : d.scheduledAt }))
                }
                options={[
                  { value: "now", label: "Publier maintenant", icon: <Zap className="size-4" /> },
                  { value: "later", label: "Programmer", icon: <CalendarClock className="size-4" /> },
                ]}
              />
              {scheduled && (
                <div className="animate-fade-in space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {QUICK_SLOTS.map((s) => (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => update((d) => ({ ...d, scheduledAt: s.at() }))}
                        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      type="datetime-local"
                      className="sm:max-w-64"
                      value={draft.scheduledAt ? toLocalInput(draft.scheduledAt) : ""}
                      min={toLocalInput(Date.now())}
                      onChange={(e) => update((d) => ({ ...d, scheduledAt: fromLocalInput(e.target.value) }))}
                    />
                    {draft.scheduledAt && (
                      <span className="text-sm text-muted">
                        {formatDateTime(draft.scheduledAt)} · <span className="font-medium text-fg">{formatRelative(draft.scheduledAt)}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted">
                    Fuseau horaire : {Intl.DateTimeFormat().resolvedOptions().timeZone}. Le serveur VideoPosting doit être démarré à l&apos;heure prévue.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* 6. Annonce Discord (si des webhooks sont configurés) */}
          <ComposerDiscordCard
            value={draft.discordWebhookIds}
            onChange={(ids) => update((d) => ({ ...d, discordWebhookIds: ids }))}
            platforms={draft.platforms}
            demoMode={!!settings?.demoMode}
            readOnly={readOnly}
          />
        </div>

        {/* Colonne droite : aperçu + vérifications */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-5">
            <Card className="p-5">{previewPanel}</Card>
            <div ref={checklistRef}>
              <Checklist errors={errors} warnings={warnings} attempted={showErrors} />
            </div>
          </div>
        </div>
        <div className="lg:hidden">
          <Checklist errors={errors} warnings={warnings} attempted={showErrors} />
        </div>
      </div>

      {/* Barre d'actions mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
        <Button size="icon" onClick={() => setMobilePreview(true)} aria-label="Aperçu">
          <Eye className="size-4" />
        </Button>
        <Button onClick={saveDraft} loading={busy === "draft"} disabled={readOnly} className="flex-1">
          <Save className="size-4" /> Brouillon
        </Button>
        <Button variant="primary" onClick={requestSubmit} disabled={readOnly || !!busy} className="flex-[1.4]">
          {scheduled ? <CalendarClock className="size-4" /> : <Send className="size-4" />}
          {primaryLabel}
        </Button>
      </div>

      <Dialog open={mobilePreview} onClose={() => setMobilePreview(false)} title="Aperçu">
        {previewPanel}
      </Dialog>

      {/* Confirmation */}
      <Dialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === "schedule" ? "Programmer la publication" : "Publier maintenant"}
        description={
          confirm === "schedule"
            ? `${photo ? "Les photos seront publiées" : "La vidéo sera publiée"} le ${formatDateTime(draft.scheduledAt)} sur ${draft.platforms.length} plateforme${draft.platforms.length > 1 ? "s" : ""}.`
            : `${photo ? "Les photos vont être envoyées" : "La vidéo va être envoyée"} sur ${draft.platforms.length} plateforme${draft.platforms.length > 1 ? "s" : ""}.`
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={doSubmit} loading={busy === "publish" || busy === "schedule"}>
              {confirm === "schedule" ? <CalendarClock className="size-4" /> : <Send className="size-4" />}
              {confirm === "schedule" ? "Confirmer la programmation" : "Publier"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {draft.platforms.map((p) => {
            const acc = accountBy[p];
            const detail =
              p === "youtube"
                ? `${label("youtube")} · ${YOUTUBE_PRIVACY_LABELS[resolved.youtube.privacy].label}`
                : p === "tiktok"
                  ? `${label("tiktok")} · ${
                      resolved.tiktok.mode === "inbox"
                        ? "brouillon dans la boîte de réception TikTok"
                        : `visible par : ${resolved.tiktok.privacyLevel ? TIKTOK_PRIVACY_LABELS[resolved.tiktok.privacyLevel] : "—"}`
                    }`
                  : `${label("instagram")}${!photo && resolved.instagram.shareToFeed ? " · partagé dans le fil" : ""}`;
            return (
              <div key={p} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <PlatformBadge platform={p} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{PLATFORMS[p].name}</p>
                  <p className="truncate text-xs text-muted">{detail}</p>
                </div>
                {acc && (
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <Avatar src={acc.avatarUrl} name={acc.name} size={22} />
                    <span className="hidden max-w-32 truncate sm:inline">{acc.username ? `@${acc.username.replace(/^@/, "")}` : acc.name}</span>
                  </span>
                )}
                {acc?.demo && <Badge tone="warning">Démo</Badge>}
              </div>
            );
          })}
          {discordTargets.length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <DiscordBadge size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Annonce Discord</p>
                <p className="truncate text-xs text-muted">{discordTargets.map((h) => h.name).join(", ")}</p>
              </div>
            </div>
          )}
          {warnings.length > 0 && (
            <div className="rounded-xl bg-warning/10 p-3 text-xs text-warning">
              {warnings.map((w, i) => (
                <p key={i}>
                  • {w.platform !== "general" && `${PLATFORMS[w.platform].name} : `}
                  {w.message}
                </p>
              ))}
            </div>
          )}
          {draft.platforms.includes("tiktok") && resolved.tiktok.mode === "direct" && (
            <p className="text-xs leading-relaxed text-muted">
              En publiant, vous acceptez la{" "}
              <a className="text-accent underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noreferrer">
                Music Usage Confirmation
              </a>
              {resolved.tiktok.commercialContent && resolved.tiktok.brandedContent && (
                <>
                  {" "}
                  et la{" "}
                  <a className="text-accent underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noreferrer">
                    Branded Content Policy
                  </a>
                </>
              )}{" "}
              de TikTok.
            </p>
          )}
        </div>
      </Dialog>
    </PageContainer>
  );
}

function Checklist({ errors, warnings, attempted }: { errors: Issue[]; warnings: Issue[]; attempted: boolean }) {
  const label = (i: Issue) => (i.platform === "general" ? null : <PlatformBadge platform={i.platform} size={16} className="mt-0.5" />);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Vérifications</h3>
        {errors.length === 0 ? (
          <Badge tone="success">Prêt</Badge>
        ) : (
          <Badge tone={attempted ? "danger" : "neutral"}>
            {errors.length} {attempted ? "à corriger" : "à compléter"}
          </Badge>
        )}
      </div>
      <div className="mt-4 space-y-2.5">
        {errors.length === 0 && warnings.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 className="size-4" /> Tout est prêt pour la publication.
          </p>
        )}
        {errors.map((e, i) => (
          <div key={`e${i}`} className="flex items-start gap-2 text-sm">
            {attempted ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-subtle" />
            )}
            {label(e)}
            <span className="min-w-0">{e.message}</span>
          </div>
        ))}
        {warnings.map((w, i) => (
          <div key={`w${i}`} className="flex items-start gap-2 text-sm text-muted">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
            {label(w)}
            <span className="min-w-0">{w.message}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
