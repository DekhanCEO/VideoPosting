import "server-only";
import { execFile } from "node:child_process";

/**
 * Analyse facultative avec ffprobe / ffmpeg (s'ils sont installés).
 * Sert de secours quand le navigateur ne sait pas lire la vidéo (HEVC, codecs exotiques…).
 */

function run(cmd: string, args: string[], timeoutMs = 20_000): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve(err ? null : stdout));
  });
}

export async function probeVideo(file: string): Promise<{ duration?: number; width?: number; height?: number } | null> {
  const out = await run(process.env.FFPROBE_PATH || "ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:stream_side_data=rotation:stream_tags=rotate:format=duration",
    "-of",
    "json",
    file,
  ]);
  if (!out) return null;
  try {
    const data = JSON.parse(out) as {
      streams?: { width?: number; height?: number; tags?: { rotate?: string }; side_data_list?: { rotation?: number }[] }[];
      format?: { duration?: string };
    };
    const s = data.streams?.[0];
    const rotation = Math.abs(Number(s?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? s?.tags?.rotate ?? 0));
    const swap = rotation === 90 || rotation === 270;
    return {
      duration: data.format?.duration ? Number(data.format.duration) : undefined,
      width: swap ? s?.height : s?.width,
      height: swap ? s?.width : s?.height,
    };
  } catch {
    return null;
  }
}

/** Extrait une image JPEG de la vidéo (vignette). */
export async function extractFrame(file: string, out: string, atSec = 1): Promise<boolean> {
  const res = await run(process.env.FFMPEG_PATH || "ffmpeg", [
    "-y",
    "-v",
    "error",
    "-ss",
    String(atSec),
    "-i",
    file,
    "-frames:v",
    "1",
    "-vf",
    "scale='min(720,iw)':-2",
    "-q:v",
    "4",
    out,
  ]);
  return res !== null;
}
