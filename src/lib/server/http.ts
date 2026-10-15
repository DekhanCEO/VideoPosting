import "server-only";
import fs from "node:fs";
import http from "node:http";
import https from "node:https";

/** Erreur renvoyée par une plateforme, avec un message lisible pour l'utilisateur. */
export class PlatformError extends Error {
  constructor(
    message: string,
    public readonly details?: unknown,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "PlatformError";
  }
}

export class AbortedError extends Error {
  constructor() {
    super("Publication annulée");
    this.name = "AbortedError";
  }
}

export function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new AbortedError();
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError());
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new AbortedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function form(data: Record<string, string | number | boolean | undefined | null>): URLSearchParams {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  return p;
}

/** Lit une portion d'un fichier en mémoire (morceau d'envoi). */
export async function readChunk(filePath: string, start: number, length: number): Promise<Buffer> {
  const handle = await fs.promises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, start);
    return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/**
 * Envoie un fichier en flux (sans le charger en mémoire) avec suivi de progression.
 * Utilisé pour l'envoi « resumable » d'Instagram, qui prend le fichier en une seule requête.
 */
export function streamUpload(opts: {
  url: string;
  method?: string;
  headers: Record<string, string>;
  filePath: string;
  start?: number;
  size: number;
  onProgress?: (sentBytes: number) => void;
  signal?: AbortSignal;
}): Promise<{ status: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const url = new URL(opts.url);
    const client = url.protocol === "http:" ? http : https;
    const start = opts.start ?? 0;
    const req = client.request(
      url,
      {
        method: opts.method ?? "POST",
        headers: { ...opts.headers, "Content-Length": String(opts.size - start) },
        signal: opts.signal,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          let body: unknown = text;
          try {
            body = text ? JSON.parse(text) : null;
          } catch {
            /* texte brut */
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
        res.on("error", reject);
      },
    );
    req.on("error", (err) => (opts.signal?.aborted ? reject(new AbortedError()) : reject(err)));
    const stream = fs.createReadStream(opts.filePath, { start, highWaterMark: 1024 * 1024 });
    let sent = start;
    stream.on("data", (chunk) => {
      sent += chunk.length;
      opts.onProgress?.(sent);
    });
    stream.on("error", (err) => {
      req.destroy(err);
      reject(err);
    });
    stream.pipe(req);
  });
}
