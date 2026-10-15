/**
 * Protection optionnelle par mot de passe (variable APP_PASSWORD).
 * Utilise uniquement Web Crypto pour fonctionner dans le proxy comme dans les routes.
 */

export const SESSION_COOKIE = "vp_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 3600;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function key(password: string): Promise<CryptoKey> {
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`vp-session:${password}`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function createSessionToken(password: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const sig = await crypto.subtle.sign("HMAC", await key(password), encoder.encode(String(exp)));
  return `${exp}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(password: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!sig || !Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = toBase64Url(await crypto.subtle.sign("HMAC", await key(password), encoder.encode(expStr)));
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
}

/** Comparaison en temps constant du mot de passe saisi. */
export async function passwordMatches(input: string, expected: string): Promise<boolean> {
  const a = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(input)));
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(expected)));
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
