/**
 * TikTok renvoie certains identifiants de vidéo sous forme d'entiers 64 bits, que JSON.parse arrondit
 * (7300000000000000001 → 7300000000000000000). On les convertit en chaînes avant l'analyse.
 */
export function parseTiktokJson(text: string): unknown {
  if (!text) return null;
  const safe = text.replace(/("publicaly_available_post_id"\s*:\s*\[)([^\]]*)\]/g, (_m, head: string, list: string) => `${head}${list.replace(/(-?\d{16,})/g, '"$1"')}]`);
  try {
    return JSON.parse(safe);
  } catch {
    return text;
  }
}
