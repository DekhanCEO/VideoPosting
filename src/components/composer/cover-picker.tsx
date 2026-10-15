"use client";

import { useEffect, useRef, useState } from "react";
import { captureFilmstrip } from "@/lib/upload-client";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui";

/**
 * Choix d'une image de couverture dans la vidéo : pellicule de vignettes + curseur.
 * La valeur est exprimée en millisecondes depuis le début.
 */
export function CoverPicker({
  src,
  duration,
  valueMs,
  onChange,
  aspect = "9/16",
}: {
  src: string;
  duration: number;
  valueMs: number;
  onChange: (ms: number) => void;
  aspect?: string;
}) {
  const [frames, setFrames] = useState<{ time: number; url: string }[] | null>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let canceled = false;
    let urls: string[] = [];
    setFrames(null);
    captureFilmstrip(src, 8)
      .then((f) => {
        urls = f.map((x) => x.url);
        if (!canceled) setFrames(f);
      })
      .catch(() => !canceled && setFrames([]));
    return () => {
      canceled = true;
      urls.forEach(URL.revokeObjectURL);
    };
  }, [src]);

  useEffect(() => {
    if (video.current && Math.abs(video.current.currentTime - valueMs / 1000) > 0.05) {
      video.current.currentTime = valueMs / 1000;
    }
  }, [valueMs]);

  const max = Math.max(0, Math.floor(duration * 1000) - 100);

  return (
    <div className="flex gap-4">
      <div className="w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-black" style={{ aspectRatio: aspect }}>
        <video ref={video} src={src} muted playsInline preload="auto" className="size-full object-cover" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="relative">
          <div className="flex h-16 overflow-hidden rounded-xl border border-border bg-surface-2">
            {frames === null
              ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-full flex-1 rounded-none" />)
              : frames.map((f) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={f.time} src={f.url} alt="" className="h-full min-w-0 flex-1 object-cover" />
                ))}
          </div>
          <div
            className="pointer-events-none absolute -top-1 -bottom-1 w-2 -translate-x-1/2 rounded-md border-2 border-white shadow-[0_0_0_2px_var(--accent)]"
            style={{ left: `${max ? (valueMs / max) * 100 : 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={max}
            step={50}
            value={Math.min(valueMs, max)}
            onChange={(e) => onChange(Number(e.target.value))}
            className={cn("absolute inset-0 size-full cursor-pointer opacity-0")}
            aria-label="Position de la couverture"
          />
        </div>
        <p className="text-xs text-muted">
          Faites glisser pour choisir l&apos;image de couverture · <span className="font-medium text-fg tabular-nums">{formatDuration(valueMs / 1000)}</span>
        </p>
      </div>
    </div>
  );
}
