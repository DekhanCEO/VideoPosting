const MIN_CHUNK = 5 * 1024 * 1024;
const PREFERRED_CHUNK = 10 * 1024 * 1024;

/**
 * Découpage imposé par TikTok pour l'envoi FILE_UPLOAD :
 * morceaux de 5 à 64 Mo, le dernier absorbe le reste (jusqu'à 128 Mo),
 * un seul morceau si la vidéo fait moins de 5 Mo.
 */
export function tiktokChunks(size: number): { chunkSize: number; count: number; ranges: [number, number][] } {
  if (size <= MIN_CHUNK) return { chunkSize: size, count: 1, ranges: [[0, size - 1]] };
  const chunkSize = Math.min(PREFERRED_CHUNK, size);
  const count = Math.max(1, Math.floor(size / chunkSize));
  const ranges: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const start = i * chunkSize;
    const end = i === count - 1 ? size - 1 : start + chunkSize - 1;
    ranges.push([start, end]);
  }
  return { chunkSize, count, ranges };
}
