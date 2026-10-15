import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { route } from "@/lib/server/api";
import { getCredentials, getPublicUrl, redirectUri } from "@/lib/server/config";
import { adapters } from "@/lib/server/platforms";
import { demoAccount } from "@/lib/server/platforms/demo";
import { getSettings, saveAccount } from "@/lib/server/store";
import { isPlatformId } from "@/lib/types";

type Ctx = { params: Promise<{ platform: string }> };

/** Démarre la connexion OAuth (ou crée un compte fictif en mode démo). */
export const GET = route<Ctx>(async (req, { params }) => {
  const { platform } = await params;
  const base = getPublicUrl(req);
  if (!isPlatformId(platform)) return NextResponse.redirect(new URL("/accounts", base));

  if (getSettings().demoMode) {
    saveAccount({ ...demoAccount(platform), connectedAt: Date.now() });
    return NextResponse.redirect(new URL(`/accounts?connected=${platform}`, base));
  }

  const credentials = getCredentials(platform);
  if (!credentials.configured) {
    return NextResponse.redirect(new URL(`/settings?missing=${platform}#${platform}`, base));
  }

  const state = crypto.randomBytes(16).toString("hex");
  const url = adapters[platform].buildAuthUrl({ state, redirectUri: redirectUri(platform, req), credentials });
  const res = NextResponse.redirect(url);
  res.cookies.set(`vp_oauth_${platform}`, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: base.startsWith("https://"),
    maxAge: 600,
    path: "/",
  });
  return res;
});
