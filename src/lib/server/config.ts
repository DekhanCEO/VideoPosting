import "server-only";
import type { InstagramLoginType, PlatformId } from "../types";
import { getSettings } from "./store";

/** URL publique de l'application (utilisée pour les redirections OAuth et les liens vidéo Instagram). */
export function getPublicUrl(req?: Request): string {
  const env = process.env.PUBLIC_URL?.trim();
  if (env) return env.replace(/\/+$/, "");
  if (req) {
    const h = req.headers;
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto.split(",")[0]}://${host.split(",")[0]}`;
    }
  }
  return `http://localhost:${process.env.PORT || 3000}`;
}

/** Instagram doit pouvoir télécharger la vidéo : il faut une URL HTTPS joignable depuis Internet. */
export function isPubliclyReachable(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname;
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function redirectUri(platform: PlatformId, req?: Request): string {
  return `${getPublicUrl(req)}/api/auth/${platform}/callback`;
}

export interface ResolvedCredentials {
  clientId: string;
  clientSecret: string;
  fromEnv: boolean;
  configured: boolean;
  loginType: InstagramLoginType;
  graphVersion: string;
}

/** Les variables d'environnement sont prioritaires sur les valeurs saisies dans les paramètres. */
export function getCredentials(platform: PlatformId): ResolvedCredentials {
  const s = getSettings().credentials;
  let clientId = "";
  let clientSecret = "";
  let fromEnv = false;
  let loginType: InstagramLoginType = s.instagram.loginType;
  let graphVersion = s.instagram.graphVersion || "v24.0";

  if (platform === "youtube") {
    fromEnv = !!(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET);
    clientId = process.env.YOUTUBE_CLIENT_ID || s.youtube.clientId;
    clientSecret = process.env.YOUTUBE_CLIENT_SECRET || s.youtube.clientSecret;
  } else if (platform === "tiktok") {
    fromEnv = !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
    clientId = process.env.TIKTOK_CLIENT_KEY || s.tiktok.clientKey;
    clientSecret = process.env.TIKTOK_CLIENT_SECRET || s.tiktok.clientSecret;
  } else {
    fromEnv = !!(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
    clientId = process.env.INSTAGRAM_APP_ID || s.instagram.appId;
    clientSecret = process.env.INSTAGRAM_APP_SECRET || s.instagram.appSecret;
    const envLogin = process.env.INSTAGRAM_LOGIN_TYPE;
    if (envLogin === "instagram" || envLogin === "facebook") loginType = envLogin;
    if (process.env.META_GRAPH_VERSION) graphVersion = process.env.META_GRAPH_VERSION;
  }

  return {
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    fromEnv,
    configured: !!(clientId.trim() && clientSecret.trim()),
    loginType,
    graphVersion,
  };
}
