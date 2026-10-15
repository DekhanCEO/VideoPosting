"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Crop, ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { aspectRatioLabel, PHOTO_LIMITS } from "@/lib/platforms";
import type { MediaAsset } from "@/lib/types";
import { cropImage, mediaUrl, prepareImage, uploadFile } from "@/lib/upload-client";
import { cn } from "@/lib/utils";
import { PlatformBadge } from "../icons";
import { Badge, Button, Card, CardHeader, Progress } from "../ui";

interface Pending {
  key: string;
  name: string;
  preview: string;
  progress: number;
  error?: string;
}

const MAX = PHOTO_LIMITS.tiktok.max;

/** Rapport accepté par Instagram le plus proche (4:5 pour les photos trop verticales, 1,91:1 pour les panoramiques). */
function instagramTarget(m: MediaAsset): number | null {
  if (!m.width || !m.height) return null;
  const r = m.width / m.height;
  if (r < PHOTO_LIMITS.instagram.minRatio - 0.01) return PHOTO_LIMITS.instagram.minRatio;
  if (r > PHOTO_LIMITS.instagram.maxRatio + 0.01) return PHOTO_LIMITS.instagram.maxRatio;
  return null;
}

export function PhotoUploader({
  images,
  onChange,
  onBusyChange,
  instagram,
  canDeleteFromServer,
}: {
  images: MediaAsset[];
  onChange: (update: (images: MediaAsset[]) => MediaAsset[]) => void;
  onBusyChange?: (busy: boolean) => void;
  /** Instagram sélectionné : on signale les formats refusés. */
  instagram: boolean;
  /** Publication pas encore enregistrée : les photos retirées peuvent être supprimées du serveur. */
  canDeleteFromServer: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [cropping, setCropping] = useState<Set<string>>(new Set());
  const busy = pending.some((p) => !p.error) || cropping.size > 0;
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  const removeFromServer = (id: string) => {
    if (canDeleteFromServer) void api(`/api/media/${id}`, { method: "DELETE" }).catch(() => undefined);
  };

  const addFiles = async (files: File[]) => {
    const room = MAX - images.length - pending.filter((p) => !p.error).length;
    const accepted = files.filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (accepted.length < files.length) toast.error("Seules les images sont acceptées en mode Photos.");
    if (accepted.length > room) toast.warning(`${MAX} photos maximum : ${accepted.length - room} photo(s) ignorée(s).`);
    const batch = accepted.slice(0, Math.max(0, room)).map((f) => ({ file: f, key: crypto.randomUUID(), preview: URL.createObjectURL(f) }));
    setPending((p) => [...p, ...batch.map((b) => ({ key: b.key, name: b.file.name, preview: b.preview, progress: 0 }))]);

    // Envoi l'une après l'autre : l'ordre d'import est conservé.
    for (const b of batch) {
      try {
        const { blob, width, height } = await prepareImage(b.file);
        const asset = await uploadFile(blob, {
          fileName: b.file.name.replace(/\.[^.]+$/, "") + ".jpg",
          mimeType: "image/jpeg",
          meta: { width, height },
          onProgress: (f) => setPending((list) => list.map((p) => (p.key === b.key ? { ...p, progress: f } : p))),
        });
        onChange((imgs) => [...imgs, asset]);
        setPending((list) => list.filter((p) => p.key !== b.key));
        URL.revokeObjectURL(b.preview);
      } catch (err) {
        setPending((list) => list.map((p) => (p.key === b.key ? { ...p, error: (err as Error).message } : p)));
      }
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    onChange((imgs) => {
      const next = [...imgs];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const remove = (id: string) => {
    onChange((imgs) => imgs.filter((m) => m.id !== id));
    removeFromServer(id);
  };

  const crop = async (m: MediaAsset) => {
    const target = instagramTarget(m);
    if (!target) return;
    setCropping((s) => new Set(s).add(m.id));
    try {
      const { blob, width, height } = await cropImage(mediaUrl(m.id), target);
      const asset = await uploadFile(blob, { fileName: m.fileName.replace(/\.[^.]+$/, "") + "-recadree.jpg", mimeType: "image/jpeg", meta: { width, height } });
      onChange((imgs) => imgs.map((x) => (x.id === m.id ? asset : x)));
      removeFromServer(m.id);
    } catch (err) {
      toast.error("Recadrage impossible", { description: (err as Error).message });
    } finally {
      setCropping((s) => {
        const next = new Set(s);
        next.delete(m.id);
        return next;
      });
    }
  };

  const outOfFormat = instagram ? images.filter((m) => instagramTarget(m) !== null) : [];
  const full = images.length + pending.filter((p) => !p.error).length >= MAX;

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) void addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <Card>
      <CardHeader
        title="Photos"
        description="Une photo ou un carrousel : publication Instagram, diaporama TikTok. Glissez pour changer l'ordre."
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={images.length > (instagram ? PHOTO_LIMITS.instagram.max : MAX) ? "danger" : "neutral"}>
              {images.length} / {instagram ? PHOTO_LIMITS.instagram.max : MAX}
            </Badge>
            {images.length > 0 && (
              <Button size="sm" onClick={() => input.current?.click()} disabled={full}>
                <ImagePlus className="size-4" /> Ajouter
              </Button>
            )}
          </div>
        }
      />
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <div className="p-5">
        {images.length === 0 && pending.length === 0 ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragOver ? "border-accent bg-accent-soft" : "border-border hover:border-accent/60 hover:bg-surface-2",
            )}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <UploadCloud className="size-6" />
            </span>
            <span className="text-base font-semibold">Glissez vos photos ici</span>
            <span className="text-sm text-muted">
              ou cliquez pour choisir · JPG, PNG, WebP · jusqu&apos;à {MAX} photos ({PHOTO_LIMITS.instagram.max} pour un carrousel Instagram)
            </span>
          </button>
        ) : (
          <div
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) e.preventDefault();
            }}
            onDrop={(e) => {
              if (e.dataTransfer.files.length) onDrop(e);
            }}
            className="space-y-4"
          >
            {outOfFormat.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
                <PlatformBadge platform="instagram" size={18} />
                <span className="min-w-0 flex-1">
                  {outOfFormat.length} photo{outOfFormat.length > 1 ? "s" : ""} hors du format Instagram (entre 4:5 et 1,91:1).
                </span>
                <Button size="sm" onClick={() => outOfFormat.forEach((m) => void crop(m))} disabled={cropping.size > 0}>
                  <Crop className="size-4" /> Tout recadrer
                </Button>
              </div>
            )}
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
              {images.map((m, i) => {
                const target = instagram ? instagramTarget(m) : null;
                return (
                  <li
                    key={m.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragEnd={() => setDragIndex(null)}
                    onDragOver={(e) => {
                      if (dragIndex === null) return;
                      e.preventDefault();
                      if (dragIndex !== i) {
                        move(dragIndex, i);
                        setDragIndex(i);
                      }
                    }}
                    className={cn(
                      "group relative aspect-[4/5] cursor-grab overflow-hidden rounded-xl border bg-surface-2 active:cursor-grabbing",
                      target ? "border-warning/60" : "border-border",
                      dragIndex === i && "opacity-50",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(m.id)} alt={`Photo ${i + 1}`} className="size-full object-cover" draggable={false} />
                    <span className="absolute top-1.5 left-1.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-black/60 px-1 text-[11px] font-semibold text-white">
                      {i + 1}
                    </span>
                    {i === 0 && <span className="absolute top-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">Couverture</span>}
                    <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white tabular-nums">
                      {aspectRatioLabel(m.width, m.height)}
                    </span>
                    {cropping.has(m.id) && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                        <Loader2 className="size-5 animate-spin" />
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button type="button" aria-label="Déplacer à gauche" onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded-md bg-white/90 p-1 text-black disabled:opacity-40">
                        <ArrowLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Déplacer à droite"
                        onClick={() => move(i, i + 1)}
                        disabled={i === images.length - 1}
                        className="rounded-md bg-white/90 p-1 text-black disabled:opacity-40"
                      >
                        <ArrowRight className="size-3.5" />
                      </button>
                      <button type="button" aria-label="Retirer la photo" onClick={() => remove(m.id)} className="rounded-md bg-white/90 p-1 text-danger">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {target && !cropping.has(m.id) && (
                      <button
                        type="button"
                        onClick={() => void crop(m)}
                        className="absolute inset-x-1.5 top-8 flex items-center justify-center gap-1 rounded-lg bg-warning px-2 py-1 text-[11px] font-semibold text-white shadow"
                        title="Recadrer au centre pour Instagram"
                      >
                        <Crop className="size-3" /> Recadrer {target < 1 ? "4:5" : "1,91:1"}
                      </button>
                    )}
                  </li>
                );
              })}
              {pending.map((p) => (
                <li key={p.key} className="relative aspect-[4/5] overflow-hidden rounded-xl border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.preview} alt="" className="size-full object-cover opacity-60" />
                  <div className="absolute inset-x-2 bottom-2 space-y-1">
                    {p.error ? (
                      <div className="rounded-md bg-danger/90 p-1.5 text-[10px] leading-tight text-white">
                        {p.error}
                        <button type="button" className="ml-1 underline" onClick={() => setPending((l) => l.filter((x) => x.key !== p.key))}>
                          Retirer
                        </button>
                      </div>
                    ) : (
                      <Progress value={Math.round(p.progress * 100)} />
                    )}
                  </div>
                </li>
              ))}
              {!full && (
                <li>
                  <button
                    type="button"
                    onClick={() => input.current?.click()}
                    className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent"
                  >
                    <ImagePlus className="size-5" />
                    Ajouter
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
