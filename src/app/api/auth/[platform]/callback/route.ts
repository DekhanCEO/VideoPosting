import { NextResponse } from "next/server";
import { getCredentials, getPublicUrl, redirectUri } from "@/lib/server/config";
import { ensureScheduler } from "@/lib/server/scheduler";
import { adapters } from "@/lib/server/platforms";
import { saveAccount } from "@/lib/server/store";
import { isPlatformId } from "@/lib/types";

type Ctx = { params: Promise<{ platform: string }> };

/** Retour de la plateforme après autorisation : échange du code contre des jetons. */
export async function GET(req: Request, { params }: Ctx) {
  ensureScheduler();
  const { platform } = await params;
  const base = getPublicUrl(req);
  const back = (query: string) => {
    const res = NextResponse.redirect(new URL(`/accounts?${query}`, base));
    if (isPlatformId(platform)) res.cookies.delete(`vp_oauth_${platform}`);
    return res;
  };
  if (!isPlatformId(platform)) return back("error=" + encodeURIComponent("Plateforme inconnue."));

  const url = new URL(req.url);
  const error = url.searchParams.get("error_description") || url.searchParams.get("error");
  if (error) {
    const message = error === "access_denied" ? "Autorisation refusée." : error;
    return back(`platform=${platform}&error=${encodeURIComponent(message)}`);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`vp_oauth_${platform}=`))
    ?.split("=")[1];
  if (!code || !state || !cookie || cookie !== state) {
    return back(`platform=${platform}&error=${encodeURIComponent("Session de connexion expirée, veuillez réessayer.")}`);
  }

  try {
    const account = await adapters[platform].exchangeCode({
      code,
      redirectUri: redirectUri(platform, req),
      credentials: getCredentials(platform),
    });
    saveAccount({ ...account, connectedAt: Date.now() });
    return back(`connected=${platform}`);
  } catch (err) {
    console.error(`[oauth] ${platform}`, err);
    return back(`platform=${platform}&error=${encodeURIComponent((err as Error).message)}`);
  }
}
