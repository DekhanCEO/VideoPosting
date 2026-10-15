"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Film, Replace, Trash2, UploadCloud, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { aspectRatioLabel, isYoutubeShort, LIMITS } from "@/lib/platforms";
import { formatBytes, formatDuration } from "@/lib/format";
import type { MediaAsset } from "@/lib/types";
import { ACCEPTED_VIDEO, captureFrame, mediaUrl, readVideoMeta, uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "../icons";
import { Button, Card, Progress } from "../ui";

export interface UploadState {
  fileName: string;
  progress: number;
  localUrl: string;
  error?: string;
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-medium text-muted tabular-nums">{children}</span>;
}

function compatibility(media: MediaAsset) {
  const d = media.duration ?? 0;
  const vertical = (media.height ?? 0) >= (media.width ?? 0);
  return [
    {
      platform: "tiktok" as const,
      ok: d <= LIMITS.tiktok.defaultMaxDuration && d >= LIMITS.tiktok.minDuration,
      label: d > LIMITS.tiktok.defaultMaxDuration ? "Peut dépasser la durée max" : vertical ? "Format idéal" : "Accepté (horizontal)",
    },
    {
      platform: "youtube" as const,
      ok: true,
      label: isYoutubeShort(media) ? "Publiée en Short" : "Vidéo classique",
    },
    {
      platform: "instagram" as const,
      ok: d >= LIMITS.instagram.minDuration && d <= LIMITS.instagram.maxDuration && media.mimeType !== "video/webm",
      label:
        media.mimeType === "video/webm"
          ? "WebM non accepté"
          : d > LIMITS.instagram.maxDuration
            ? "Trop longue (15 min max)"
            : vertical
              ? "Reel 9:16"
              : "Reel (sera recadré)",
    },
  ];
}

export function VideoUploader({
  media,
  upload,
  onUploadStart,
  onUploadProgress,
  onUploaded,
  onUploadError,
  onRemove,
}: {
  media: MediaAsset | null | undefined;
  upload: UploadState | null;
  onUploadStart: (u: UploadState) => void;
  onUploadProgress: (p: number) => void;
  onUploaded: (m: MediaAsset) => void;
  onUploadError: (message: string) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    const type = file.type || (file.name.toLowerCase().endsWith(".mov") ? "video/quicktime" : "");
    if (!ACCEPTED_VIDEO.includes(type)) {
      toast.error("Format non pris en charge", { description: "Utilisez une vidéo MP4, MOV ou WebM." });
      return;
    }
    const localUrl = URL.createObjectURL(file);
    onUploadStart({ fileName: file.name, progress: 0, localUrl });
    const controller = new AbortController();
    abort.current = controller;
    try {
      const meta = await readVideoMeta(localUrl).catch(() => null);
      let posterId: string | undefined;
      try {
        const poster = await captureFrame(localUrl, Math.min(1, (meta?.duration ?? 2) / 2), 720, 0.82);
        const asset = await uploadFile(poster, { fileName: "poster.jpg", mimeType: "image/jpeg", signal: controller.signal });
        posterId = asset.id;
      } catch (err) {
        if ((err as Error).name === "AbortError") throw err;
      }
      const asset = await uploadFile(file, {
        fileName: file.name,
        mimeType: type,
        signal: controller.signal,
        onProgress: onUploadProgress,
        meta: { ...(meta ?? {}), posterId },
      });
      onUploaded(asset);
      toast.success("Vidéo prête", { description: file.name });
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        onUploadError("");
        return;
      }
      onUploadError((err as Error).message);
      toast.error("Échec de l'envoi", { description: (err as Error).message });
    } finally {
      abort.current = null;
    }
  };

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept={ACCEPTED_VIDEO.join(",") + ",.mov,.mp4,.webm,.m4v"}
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void handleFile(f);
        e.target.value = "";
      }}
    />
  );

  // Envoi en cours
  if (upload && !upload.error && !media) {
    const pct = Math.round(upload.progress * 100);
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div className="relative mx-auto h-56 w-32 shrink-0 overflow-hidden rounded-xl bg-black sm:mx-0">
            <video src={upload.localUrl} muted playsInline autoPlay loop className="size-full object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-white tabular-nums drop-shadow">{pct}%</span>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <UploadCloud className="size-4 text-accent" /> Envoi de la vidéo…
            </div>
            <p className="truncate text-sm text-muted">{upload.fileName}</p>
            <Progress value={pct} />
            <p className="text-xs text-muted">Vous pouvez remplir les textes pendant l&apos;envoi.</p>
            <div>
              <Button size="sm" variant="ghost" onClick={() => abort.current?.abort()}>
                <X className="size-4" /> Annuler
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Vidéo prête
  if (media) {
    const ratio = aspectRatioLabel(media.width, media.height);
    const vertical = (media.height ?? 0) >= (media.width ?? 0);
    return (
      <Card className="overflow-hidden">
        {fileInput}
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div
            className={cn("mx-auto shrink-0 overflow-hidden rounded-xl bg-black sm:mx-0", vertical ? "h-64 w-36" : "aspect-video w-full sm:w-72")}
          >
            <video src={mediaUrl(media.id)} controls playsInline preload="metadata" className="size-full object-contain" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <CheckCircle2 className="size-4" /> Vidéo prête
                </div>
                <p className="mt-1 truncate font-medium" title={media.fileName}>
                  {media.fileName}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" onClick={() => input.current?.click()} title="Remplacer la vidéo">
                  <Replace className="size-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={onRemove} title="Retirer la vidéo">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Chip>{formatDuration(media.duration)}</Chip>
              {media.width && media.height && (
                <Chip>
                  {media.width}×{media.height}
                </Chip>
              )}
              {ratio && <Chip>{ratio}</Chip>}
              <Chip>{formatBytes(media.size)}</Chip>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {compatibility(media).map((c) => (
                <div key={c.platform} className="flex items-center gap-2 rounded-xl border border-border px-2.5 py-2">
                  <PlatformBadge platform={c.platform} size={22} />
                  <span className={cn("min-w-0 truncate text-xs", c.ok ? "text-muted" : "text-warning")}>
                    {!c.ok && <AlertTriangle className="mr-1 inline size-3" />}
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Zone de dépôt
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) void handleFile(f);
      }}
      onClick={() => input.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-all",
        dragging ? "scale-[1.01] border-accent bg-accent-soft" : "border-border-strong bg-surface hover:border-accent hover:bg-accent-soft/40",
      )}
    >
      {fileInput}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="absolute -top-20 left-1/2 size-60 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="relative mb-4 flex size-16 items-center justify-center rounded-2xl gradient-brand text-white shadow-[0_8px_24px_-8px_var(--accent)] transition-transform group-hover:-translate-y-1">
        {dragging ? <Film className="size-7" /> : <UploadCloud className="size-7" />}
      </div>
      <p className="relative text-base font-semibold">{dragging ? "Déposez votre vidéo" : "Glissez votre vidéo ici"}</p>
      <p className="relative mt-1 text-sm text-muted">
        ou <span className="font-medium text-accent">parcourez vos fichiers</span>
      </p>
      <p className="relative mt-4 text-xs text-subtle">MP4, MOV ou WebM · format vertical 9:16 recommandé</p>
      {upload?.error && <p className="relative mt-3 text-sm text-danger">{upload.error}</p>}
    </div>
  );
}
