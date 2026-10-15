import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { MediaAsset, MediaKind } from "../types";
import { getPublicUrl } from "./config";
import { extractFrame, probeVideo } from "./probe";
import { DATA_DIR, db, getMedia, getSecret } from "./store";

export const MEDIA_DIR = path.join(/*turbopackIgnore: true*/ DATA_DIR, "media");

export const ACCEPTED_TYPES: Record<string, { kind: MediaKind; ext: string; maxSize: number }> = {
  "video/mp4": { kind: "video", ext: ".mp4", maxSize: 20 * 1024 ** 3 },
  "video/quicktime": { kind: "video", ext: ".mov", maxSize: 20 * 1024 ** 3 },
  "video/webm": { kind: "video", ext: ".webm", maxSize: 20 * 1024 ** 3 },
  "video/x-m4v": { kind: "video", ext: ".m4v", maxSize: 20 * 1024 ** 3 },
  "image/jpeg": { kind: "image", ext: ".jpg", maxSize: 10 * 1024 ** 2 },
  "image/png": { kind: "image", ext: ".png", maxSize: 10 * 1024 ** 2 },
  "image/webp": { kind: "image", ext: ".webp", maxSize: 10 * 1024 ** 2 },
};

export const MAX_CHUNK_SIZE = 32 * 1024 * 1024;

export function mediaPath(asset: Pick<MediaAsset, "id" | "mimeType">): string {
  const ext = ACCEPTED_TYPES[asset.mimeType]?.ext ?? "";
  return path.join(/*turbopackIgnore: true*/ MEDIA_DIR, `${asset.id}${ext}`);
}

export function createMedia(input: { fileName: string; size: number; mimeType: string }): MediaAsset {
  const type = ACCEPTED_TYPES[input.mimeType];
  if (!type) throw new Error("Format non pris en charge. Utilisez MP4, MOV ou WebM (ou JPG/PNG pour une image).");
  if (!Number.isFinite(input.size) || input.size <= 0) throw new Error("Fichier vide.");
  if (input.size > type.maxSize) throw new Error("Fichier trop volumineux.");

  const asset: MediaAsset = {
    id: crypto.randomUUID(),
    kind: type.kind,
    fileName: input.fileName.slice(0, 200),
    mimeType: input.mimeType,
    size: input.size,
    uploadedBytes: 0,
    status: "uploading",
    createdAt: Date.now(),
  };
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  fs.writeFileSync(mediaPath(asset), "");
  db().update((d) => {
    d.media.push(asset);
  });
  return asset;
}

const locks = new Map<string, Promise<unknown>>();

/** Écrit un morceau à la position indiquée. Les morceaux doivent arriver dans l'ordre. */
export async function writeChunk(id: string, offset: number, data: Buffer): Promise<MediaAsset> {
  const previous = locks.get(id) ?? Promise.resolve();
  const task = previous.then(async () => {
    const asset = getMedia(id);
    if (!asset) throw new Error("Média introuvable.");
    if (asset.status === "ready") return asset;
    if (offset !== asset.uploadedBytes) {
      // Le client reprend à partir de la position renvoyée.
      const err = new Error("offset_mismatch") as Error & { expected?: number };
      err.expected = asset.uploadedBytes;
      throw err;
    }
    if (offset + data.length > asset.size) throw new Error("Le morceau dépasse la taille annoncée.");
    const handle = await fs.promises.open(mediaPath(asset), "r+");
    try {
      await handle.write(data, 0, data.length, offset);
    } finally {
      await handle.close();
    }
    return db().update((d) => {
      const m = d.media.find((x) => x.id === id)!;
      m.uploadedBytes = offset + data.length;
      return m;
    });
  });
  locks.set(
    id,
    task.catch(() => undefined),
  );
  return task;
}

export async function completeMedia(
  id: string,
  meta: { duration?: number; width?: number; height?: number; posterId?: string },
): Promise<MediaAsset> {
  const asset = getMedia(id);
  if (!asset) throw new Error("Média introuvable.");
  if (asset.uploadedBytes !== asset.size) throw new Error("Envoi incomplet.");
  const actual = fs.statSync(mediaPath(asset)).size;
  if (actual !== asset.size) throw new Error("Le fichier reçu est incomplet.");

  // Le navigateur n'a pas pu lire la vidéo : on tente ffprobe / ffmpeg côté serveur.
  if (asset.kind === "video" && (!meta.duration || !meta.width || !meta.height)) {
    const probed = await probeVideo(mediaPath(asset));
    if (probed) meta = { ...probed, ...Object.fromEntries(Object.entries(meta).filter(([, v]) => v)) };
  }
  if (asset.kind === "video" && !meta.posterId) {
    const poster: MediaAsset = {
      id: crypto.randomUUID(),
      kind: "image",
      fileName: "poster.jpg",
      mimeType: "image/jpeg",
      size: 0,
      uploadedBytes: 0,
      status: "ready",
      createdAt: Date.now(),
    };
    const at = meta.duration ? Math.min(1, meta.duration / 2) : 0;
    if (await extractFrame(mediaPath(asset), mediaPath(poster), at)) {
      poster.size = poster.uploadedBytes = fs.statSync(mediaPath(poster)).size;
      db().update((d) => {
        d.media.push(poster);
      });
      meta.posterId = poster.id;
    }
  }

  return db().update((d) => {
    const m = d.media.find((x) => x.id === id)!;
    m.status = "ready";
    if (meta.duration && Number.isFinite(meta.duration)) m.duration = Math.round(meta.duration * 100) / 100;
    if (meta.width) m.width = Math.round(meta.width);
    if (meta.height) m.height = Math.round(meta.height);
    if (meta.posterId) m.posterId = meta.posterId;
    return m;
  });
}

export function setPoster(id: string, posterId: string) {
  db().update((d) => {
    const m = d.media.find((x) => x.id === id);
    if (m) m.posterId = posterId;
  });
}

/** Supprime un média s'il n'est plus utilisé par aucune publication. */
export function deleteMediaIfUnused(id: string | undefined) {
  if (!id) return;
  const used = db().read((d) =>
    d.posts.some((p) => p.mediaId === id || p.options.youtube.thumbnailId === id),
  );
  if (used) return;
  const asset = getMedia(id);
  if (!asset) return;
  fs.rmSync(mediaPath(asset), { force: true });
  db().update((d) => {
    d.media = d.media.filter((m) => m.id !== id);
  });
  if (asset.posterId) deleteMediaIfUnused(asset.posterId);
}

/* ------------------------------------------------------------------ */
/* URLs signées (Instagram télécharge la vidéo depuis notre serveur)   */
/* ------------------------------------------------------------------ */

function sign(id: string, exp: number): string {
  return crypto.createHmac("sha256", getSecret()).update(`${id}.${exp}`).digest("base64url");
}

export function signedMediaUrl(id: string, ttlSeconds = 6 * 3600, req?: Request): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${getPublicUrl(req)}/api/media/${id}/public?exp=${exp}&sig=${sign(id, exp)}`;
}

export function verifySignature(id: string, exp: string | null, sig: string | null): boolean {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(id, expNum));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/* ------------------------------------------------------------------ */
/* Diffusion du fichier avec prise en charge des requêtes Range        */
/* ------------------------------------------------------------------ */

export function fileResponse(asset: MediaAsset, rangeHeader: string | null, method = "GET"): Response {
  const file = mediaPath(asset);
  if (!fs.existsSync(file)) return new Response("Introuvable", { status: 404 });
  const size = fs.statSync(file).size;
  const baseHeaders: Record<string, string> = {
    "Content-Type": asset.mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  let start = 0;
  let end = size - 1;
  let status = 200;
  const match = rangeHeader?.match(/bytes=(\d*)-(\d*)/);
  if (match && size > 0) {
    if (match[1]) start = Number(match[1]);
    if (match[2]) end = Math.min(Number(match[2]), size - 1);
    if (!match[1] && match[2]) {
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    status = 206;
    baseHeaders["Content-Range"] = `bytes ${start}-${end}/${size}`;
  }
  baseHeaders["Content-Length"] = String(end - start + 1);
  if (method === "HEAD") return new Response(null, { status, headers: baseHeaders });

  const stream = fs.createReadStream(file, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers: baseHeaders });
}
