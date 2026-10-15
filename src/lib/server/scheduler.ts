import "server-only";
import { refreshExpiringTokens } from "./accounts";
import { syncAnalytics } from "./analytics";
import { recoverInterrupted, startPublishing } from "./publisher";
import { db } from "./store";

const g = globalThis as unknown as { __vpScheduler?: boolean };

const TICK_MS = 20_000;
const TOKEN_REFRESH_MS = 60 * 60_000;
const STATS_SYNC_MS = 6 * 60 * 60_000;

/** Publie les publications programmées dont l'heure est arrivée. */
export function runDuePosts(): string[] {
  const now = Date.now();
  const due = db().read((d) =>
    d.posts.filter((p) => p.status === "scheduled" && p.scheduledAt && p.scheduledAt <= now).map((p) => p.id),
  );
  for (const id of due) {
    try {
      startPublishing(id);
    } catch (err) {
      console.error(`[scheduler] Impossible de publier ${id} :`, (err as Error).message);
      db().update((d) => {
        const p = d.posts.find((x) => x.id === id);
        if (p) p.status = "failed";
      });
    }
  }
  return due;
}

export function ensureScheduler() {
  if (g.__vpScheduler) return;
  g.__vpScheduler = true;

  recoverInterrupted();
  runDuePosts();
  setInterval(runDuePosts, TICK_MS).unref();
  setInterval(() => void refreshExpiringTokens(), TOKEN_REFRESH_MS).unref();
  setInterval(() => void syncAnalytics().catch(() => undefined), STATS_SYNC_MS).unref();
  // Première synchronisation des statistiques peu après le démarrage.
  setTimeout(() => void syncAnalytics().catch(() => undefined), 15_000).unref();
  console.log("[scheduler] Planificateur démarré");
}
