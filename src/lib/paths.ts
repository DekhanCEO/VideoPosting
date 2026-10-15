/**
 * Chemins selon la cible de build :
 *  - « next » (serveur Node / versions Windows & macOS) : API Next.js sous /api ;
 *  - « php » (hébergement mutualisé) : API PHP appelée via api/index.php?r=… (aucune réécriture d'URL requise).
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const API_MODE: "next" | "php" = process.env.NEXT_PUBLIC_API_MODE === "php" ? "php" : "next";
const TRAILING = process.env.NEXT_PUBLIC_TRAILING_SLASH === "1" ? "/" : "";

/** Convertit « /api/posts/1?x=y » en URL réelle. */
export function apiUrl(path: string): string {
  if (!path.startsWith("/api/")) return path;
  if (API_MODE === "php") {
    const [route, query] = path.slice(4).split("?");
    return `${BASE_PATH}/api/index.php?r=${encodeURIComponent(route)}${query ? `&${query}` : ""}`;
  }
  return `${BASE_PATH}${path}`;
}

/** URL d'une page de l'application pour une navigation hors routeur (window.location, <a>). */
export function pageUrl(path: string, query?: string): string {
  const p = path === "/" ? "/" : `${path}${TRAILING}`;
  return `${BASE_PATH}${p}${query ? `?${query}` : ""}`;
}
