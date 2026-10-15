import { syncAnalytics } from "@/lib/server/analytics";
import { fail, json, route } from "@/lib/server/api";
import { runDuePosts } from "@/lib/server/scheduler";

/**
 * Déclencheur externe facultatif (ex. cron système) : publie les posts programmés
 * et synchronise les statistiques. Protégé par CRON_SECRET.
 */
export const GET = route(async (req) => {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("secret");
  if (!secret || given !== secret) return fail("Non autorisé", 401);
  const published = runDuePosts();
  const sync = new URL(req.url).searchParams.get("sync") === "1" ? await syncAnalytics() : undefined;
  return json({ published, sync });
});
