import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, passwordMatches, verifySessionToken } from "@/lib/session";
import type { SessionInfo } from "@/lib/types";

export async function GET(req: Request) {
  const password = process.env.APP_PASSWORD;
  const token = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  const info: SessionInfo = {
    passwordRequired: !!password,
    setupRequired: false,
    loginMethod: password ? "password" : "none",
    authenticated: !password || (await verifySessionToken(password, token)),
  };
  return NextResponse.json(info, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.json({ ok: true });
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  // Petite temporisation pour ralentir les essais de mots de passe.
  await new Promise((r) => setTimeout(r, 400));
  if (!body.password || !(await passwordMatches(body.password, password))) {
    return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
