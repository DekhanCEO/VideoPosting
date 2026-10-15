import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Chemins accessibles sans session : connexion, pages légales (vérifiées par TikTok, Meta et Google)
 * et URLs vidéo signées lues par Instagram.
 */
const PUBLIC_PATHS = [
  /^\/login$/,
  /^\/conditions\/?$/,
  /^\/confidentialite\/?$/,
  /^\/api\/session$/,
  /^\/api\/legal$/,
  /^\/api\/media\/[^/]+\/public$/,
  /^\/api\/cron$/,
];

export async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.some((re) => re.test(pathname))) return NextResponse.next();

  const ok = await verifySessionToken(password, request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
