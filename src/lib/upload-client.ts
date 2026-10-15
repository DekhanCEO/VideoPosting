"use client";

import { ApiError, api } from "./api-client";
import type { MediaAsset } from "./types";

const CHUNK_SIZE = 8 * 1024 * 1024;

export interface VideoMeta {
  duration: number;
  width: number;
  height: number;
}

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    const cleanup = () => {
      video.onloadeddata = null;
      video.onerror = null;
    };
    video.onloadeddata = () => {
      cleanup();
      resolve(video);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Impossible de lire cette vidéo dans le navigateur."));
    };
    video.src = src;
  });
}

export async function readVideoMeta(src: string): Promise<VideoMeta> {
  const video = await loadVideo(src);
  const meta = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
  video.removeAttribute("src");
  video.load();
  return meta;
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    video.currentTime = Math.max(0, Math.min(time, (video.duration || 0) - 0.05));
  });
}

function drawFrame(video: HTMLVideoElement, maxWidth: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((video.videoWidth || 720) * scale);
  canvas.height = Math.round((video.videoHeight || 1280) * scale);
  canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Capture impossible"))), "image/jpeg", quality),
  );
}

/** Capture une image de la vidéo à un instant donné (JPEG). */
export async function captureFrame(src: string, timeSec: number, maxWidth = 1280, quality = 0.88): Promise<Blob> {
  const video = await loadVideo(src);
  await seek(video, timeSec);
  return drawFrame(video, maxWidth, quality);
}

/** Génère une pellicule de vignettes réparties sur toute la durée. */
export async function captureFilmstrip(src: string, count: number, maxWidth = 160): Promise<{ time: number; url: string }[]> {
  const video = await loadVideo(src);
  const duration = video.duration || 0;
  const frames: { time: number; url: string }[] = [];
  for (let i = 0; i < count; i++) {
    const time = count === 1 ? 0 : (duration * i) / (count - 1);
    await seek(video, time);
    const blob = await drawFrame(video, maxWidth, 0.7);
    frames.push({ time, url: URL.createObjectURL(blob) });
  }
  return frames;
}

function putChunk(url: string, chunk: Blob, onProgress: (loaded: number) => void, signal?: AbortSignal) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* vide */
      }
      resolve({ status: xhr.status, body });
    };
    xhr.onerror = () => reject(new Error("network"));
    xhr.onabort = () => reject(new DOMException("Envoi annulé", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(chunk);
  });
}

/**
 * Envoie un fichier par morceaux de 8 Mo avec reprise automatique
 * en cas de coupure réseau.
 */
export async function uploadFile(
  file: Blob,
  opts: {
    fileName: string;
    mimeType?: string;
    onProgress?: (fraction: number) => void;
    signal?: AbortSignal;
    meta?: Partial<VideoMeta> & { posterId?: string };
    onCreated?: (asset: MediaAsset) => void;
  },
): Promise<MediaAsset> {
  const mimeType = opts.mimeType || file.type;
  const asset = await api<MediaAsset>("/api/media", {
    method: "POST",
    json: { fileName: opts.fileName, size: file.size, mimeType },
    signal: opts.signal,
  });
  opts.onCreated?.(asset);

  let offset = 0;
  let failures = 0;
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = file.slice(offset, end);
    try {
      const res = await putChunk(
        `/api/media/${asset.id}?offset=${offset}`,
        chunk,
        (loaded) => opts.onProgress?.((offset + loaded) / file.size),
        opts.signal,
      );
      if (res.status === 409 && typeof res.body.expected === "number") {
        offset = res.body.expected;
        continue;
      }
      if (res.status < 200 || res.status >= 300) {
        throw new ApiError(String(res.body.error ?? `Erreur ${res.status}`), res.status);
      }
      offset = Number(res.body.uploadedBytes ?? end);
      failures = 0;
    } catch (err) {
      if ((err as Error).name === "AbortError" || err instanceof ApiError) throw err;
      failures++;
      if (failures > 5) throw new Error("Connexion perdue pendant l'envoi. Réessayez.");
      await new Promise((r) => setTimeout(r, 1000 * failures));
      const current = await api<MediaAsset>(`/api/media/${asset.id}`).catch(() => null);
      if (current) offset = current.uploadedBytes;
    }
  }
  opts.onProgress?.(1);
  return api<MediaAsset>(`/api/media/${asset.id}/complete`, { method: "POST", json: opts.meta ?? {} });
}

export const ACCEPTED_VIDEO = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
export const ACCEPTED_IMAGE = ["image/jpeg", "image/png", "image/webp"];

export function mediaUrl(id: string) {
  return `/api/media/${id}/file`;
}
