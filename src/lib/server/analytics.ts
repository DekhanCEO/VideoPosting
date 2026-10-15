import "server-only";
import { addDays, daysBetween, isoDay } from "../dates";
import { PLATFORM_ORDER } from "../platforms";
import type {
  AccountSnapshot,
  AnalyticsRange,
  AnalyticsSummary,
  AudienceDemographics,
  DailyMetric,
  MetricTotals,
  PlatformId,
  PlatformSummary,
  Post,
  PostMetrics,
  SeriesPoint,
  TopPost,
} from "../types";
import { getUsableAccount } from "./accounts";
import { getCredentials } from "./config";
import { addToTotals, emptyTotals } from "../influence";
import { DEMO_AUDIENCE, DEMO_TOP_POSTS, demoPostMetrics, demoSeries } from "./demo-data";
import { adapters } from "./platforms";
import type { PlatformAdapter } from "./platforms/types";
import { incomeBetween } from "./revenue";
import { db, getAccount, getSettings, listAccounts } from "./store";

/* ------------------------------------------------------------------ */
/* Synchronisation                                                     */
/* ------------------------------------------------------------------ */

export interface SyncReport {
  platform: PlatformId;
  ok: boolean;
  error?: string;
  warnings?: string[];
}

const g = globalThis as unknown as { __vpSyncing?: Promise<SyncReport[]> | null };

export function syncAnalytics(): Promise<SyncReport[]> {
  if (g.__vpSyncing) return g.__vpSyncing;
  g.__vpSyncing = runSync().finally(() => {
    g.__vpSyncing = null;
  });
  return g.__vpSyncing;
}

async function runSync(): Promise<SyncReport[]> {
  const settings = getSettings();
  const reports: SyncReport[] = [];
  const today = isoDay();

  for (const account of listAccounts()) {
    const platform = account.platform;
    if (settings.demoMode || account.demo) {
      db().update((d) => {
        d.analytics.sync[platform] = { at: Date.now(), revenueAvailable: platform === "youtube" };
      });
      reports.push({ platform, ok: true });
      continue;
    }
    try {
      const usable = await getUsableAccount(platform);
      const adapter = adapters[platform] as unknown as PlatformAdapter;
      if (!adapter.fetchStats) continue;

      const externalIds = db().read((d) =>
        d.posts.flatMap((p) => {
          const pub = p.publications[platform];
          return pub?.status === "published" && pub.externalId && !pub.demo ? [pub.externalId] : [];
        }),
      );
      const stats = await adapter.fetchStats({
        account: usable,
        credentials: getCredentials(platform),
        externalIds,
        days: 90,
      });

      db().update((d) => {
        // Métriques par vidéo
        const postTotals = { views: 0, likes: 0 };
        for (const post of d.posts) {
          const pub = post.publications[platform];
          if (!pub?.externalId || pub.demo) continue;
          const m = stats.posts?.[pub.externalId];
          if (m) {
            pub.metrics = { ...m, updatedAt: Date.now() };
            postTotals.views += m.views;
            postTotals.likes += m.likes;
          }
        }

        // Photo du jour (une par jour et par plateforme)
        if (stats.snapshot) {
          const snap: AccountSnapshot = {
            platform,
            date: today,
            ...stats.snapshot,
            // TikTok et Instagram ne donnent pas de total de vues : on suit celles des vidéos publiées ici.
            totalViews: stats.snapshot.totalViews ?? postTotals.views,
          };
          d.analytics.snapshots = d.analytics.snapshots.filter(
            (s) => !(s.platform === platform && s.date === today && !s.demo),
          );
          d.analytics.snapshots.push(snap);
        }

        for (const metric of stats.daily ?? []) {
          const existing = d.analytics.daily.find((m) => m.platform === platform && m.date === metric.date && !m.demo);
          if (existing) Object.assign(existing, metric);
          else d.analytics.daily.push({ platform, ...metric });
        }

        // Audience fournie par l'API : remplace la précédente (y compris une saisie manuelle).
        const aud = stats.audience;
        if (aud && (aud.gender || aud.ages || aud.countries?.length)) {
          d.analytics.audience[platform] = { platform, source: "api", updatedAt: Date.now(), ...aud };
        }

        d.analytics.sync[platform] = {
          at: Date.now(),
          revenueAvailable: stats.revenueAvailable,
          error: stats.warnings?.length ? stats.warnings.join(" · ") : undefined,
        };
      });
      reports.push({ platform, ok: true, warnings: stats.warnings });
    } catch (err) {
      const message = (err as Error).message;
      db().update((d) => {
        d.analytics.sync[platform] = { ...(d.analytics.sync[platform] ?? {}), error: message };
      });
      reports.push({ platform, ok: false, error: message });
    }
  }
  return reports;
}

/* ------------------------------------------------------------------ */
/* Calcul du tableau de bord                                           */
/* ------------------------------------------------------------------ */

/** Métriques d'une vidéo : synchronisées, ou simulées en mode démo. */
export function metricsFor(post: Post, platform: PlatformId): PostMetrics | undefined {
  const pub = post.publications[platform];
  if (!pub || pub.status !== "published") return undefined;
  if (pub.metrics) return pub.metrics;
  if (pub.demo) return demoPostMetrics(post.id, platform, pub.finishedAt ?? post.publishedAt ?? post.updatedAt);
  return undefined;
}

function dataset(demo: boolean): { snapshots: AccountSnapshot[]; daily: DailyMetric[] } {
  if (demo) return demoSeries();
  return db().read((d) => ({
    snapshots: d.analytics.snapshots.filter((s) => !s.demo),
    daily: d.analytics.daily.filter((m) => !m.demo),
  }));
}

/** Valeur connue la plus récente à une date donnée (report de la dernière photo). */
function valueAt(list: AccountSnapshot[], date: string, field: "followers" | "totalViews"): number | undefined {
  let found: number | undefined;
  for (const s of list) {
    if (s.date > date) break;
    const v = s[field];
    if (v !== undefined) found = v;
  }
  return found;
}

export function getAnalyticsSummary(range: AnalyticsRange): AnalyticsSummary {
  const settings = getSettings();
  const demo = settings.demoMode;
  const { snapshots, daily } = dataset(demo);
  const today = isoDay();
  const from = addDays(today, -(range - 1));
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(range - 1));
  const days = daysBetween(from, today);

  const snapsBy = new Map<PlatformId, AccountSnapshot[]>();
  const dailyBy = new Map<PlatformId, Map<string, DailyMetric>>();
  for (const p of PLATFORM_ORDER) {
    snapsBy.set(
      p,
      snapshots.filter((s) => s.platform === p).sort((a, b) => a.date.localeCompare(b.date)),
    );
    dailyBy.set(p, new Map(daily.filter((m) => m.platform === p).map((m) => [m.date, m])));
  }

  const viewsOn = (p: PlatformId, date: string): number | undefined => {
    const m = dailyBy.get(p)!.get(date);
    if (m?.views !== undefined) return m.views;
    const list = snapsBy.get(p)!;
    const cur = list.find((s) => s.date === date)?.totalViews;
    const prev = valueAt(list, addDays(date, -1), "totalViews");
    if (cur === undefined || prev === undefined) return undefined;
    return Math.max(0, cur - prev);
  };

  // Séries quotidiennes (pour une année on agrège par semaine pour garder un graphique lisible).
  const bucket = range === 365 ? 7 : 1;
  const followersSeries: SeriesPoint[] = [];
  const viewsSeries: SeriesPoint[] = [];
  for (let i = 0; i < days.length; i += bucket) {
    const slice = days.slice(i, i + bucket);
    const last = slice[slice.length - 1];
    const fp: SeriesPoint = { date: last };
    const vp: SeriesPoint = { date: slice[0] };
    for (const p of PLATFORM_ORDER) {
      const f = valueAt(snapsBy.get(p)!, last, "followers");
      if (f !== undefined) fp[p] = f;
      let total: number | undefined;
      for (const d of slice) {
        const v = viewsOn(p, d);
        if (v !== undefined) total = (total ?? 0) + v;
      }
      if (total !== undefined) vp[p] = total;
    }
    followersSeries.push(fp);
    viewsSeries.push(vp);
  }

  const sumViews = (a: string, b: string) => {
    let n = 0;
    for (const p of PLATFORM_ORDER) for (const d of daysBetween(a, b)) n += viewsOn(p, d) ?? 0;
    return n;
  };

  const connected = new Set(listAccounts().map((a) => a.platform));
  const syncState = db().read((d) => d.analytics.sync);

  const platforms: PlatformSummary[] = PLATFORM_ORDER.map((p) => {
    const list = snapsBy.get(p)!;
    const latest = list[list.length - 1];
    const startValue = valueAt(list, prevTo, "followers");
    let views: number | null = null;
    for (const d of days) {
      const v = viewsOn(p, d);
      if (v !== undefined) views = (views ?? 0) + v;
    }
    return {
      platform: p,
      connected: connected.has(p),
      accountName: getAccount(p)?.name,
      followers: latest?.followers ?? null,
      followersDelta: latest && startValue !== undefined ? latest.followers - startValue : null,
      views,
      likes: latest?.totalLikes ?? null,
      videoCount: latest?.videoCount ?? null,
      sync: syncState[p] ?? {},
    };
  });

  const followersNow = platforms.reduce((n, p) => n + (p.followers ?? 0), 0);
  const followersBefore = PLATFORM_ORDER.reduce((n, p) => n + (valueAt(snapsBy.get(p)!, prevTo, "followers") ?? 0), 0);

  // Classement des vidéos publiées pendant la période.
  const posts = db().read((d) => d.posts.filter((p) => p.status === "published" || p.status === "partial"));
  const top: TopPost[] = [];
  const previousTotals: Partial<Record<PlatformId, MetricTotals>> = {};
  let engagementNow = 0;
  let engagementPrev = 0;
  let viewsOfPosts = 0;
  for (const post of posts) {
    const publishedDay = isoDay(post.publishedAt ?? post.updatedAt);
    const entry: TopPost = {
      postId: post.id,
      title: post.common.title || post.options.youtube.title || "Sans titre",
      publishedAt: post.publishedAt,
      totalViews: 0,
      totalEngagement: 0,
      platforms: {},
    };
    for (const p of post.platforms) {
      const m = metricsFor(post, p);
      if (!m) continue;
      entry.platforms[p] = { ...m, url: post.publications[p]?.url };
      entry.totalViews += m.views;
      entry.totalEngagement += m.likes + m.comments + m.shares + (m.saves ?? 0);
    }
    if (publishedDay >= from) {
      engagementNow += entry.totalEngagement;
      viewsOfPosts += entry.totalViews;
      top.push(entry);
    } else if (publishedDay >= prevFrom) {
      engagementPrev += entry.totalEngagement;
      for (const [p, m] of Object.entries(entry.platforms) as [PlatformId, PostMetrics][]) {
        addToTotals((previousTotals[p] ??= emptyTotals()), m);
      }
    }
  }

  if (demo && top.length < 3) {
    for (const [i, d] of DEMO_TOP_POSTS.entries()) {
      if (d.daysAgo >= range * 2) continue;
      if (d.daysAgo >= range) {
        // Période précédente : sert à l'évolution du taux d'influence.
        for (const p of d.platforms) addToTotals((previousTotals[p] ??= emptyTotals()), demoPostMetrics(`sample-${i}`, p, Date.now() - (d.daysAgo + 5) * 86400_000));
        continue;
      }
      const publishedAt = Date.now() - d.daysAgo * 86400_000;
      const entry: TopPost = { postId: `demo-${i}`, title: d.title, publishedAt, totalViews: 0, totalEngagement: 0, platforms: {} };
      for (const p of d.platforms) {
        const m = demoPostMetrics(`sample-${i}`, p, publishedAt - 5 * 86400_000);
        entry.platforms[p] = m;
        entry.totalViews += m.views;
        entry.totalEngagement += m.likes + m.comments + m.shares + (m.saves ?? 0);
      }
      engagementNow += entry.totalEngagement;
      viewsOfPosts += entry.totalViews;
      top.push(entry);
    }
  }

  // Couverture de la vidéo pour l'affichage.
  const posters = db().read((d) => new Map(d.posts.map((p) => [p.id, d.media.find((m) => m.id === p.mediaId)?.posterId])));
  for (const t of top) t.posterId = posters.get(t.postId);
  top.sort((a, b) => b.totalViews - a.totalViews);

  const hasPrevData = snapshots.some((s) => s.date <= prevTo);

  return {
    range,
    demo,
    kpis: {
      followers: { value: followersNow, previous: hasPrevData ? followersBefore : null },
      views: { value: sumViews(from, today), previous: hasPrevData ? sumViews(prevFrom, prevTo) : null },
      engagement: { value: engagementNow, previous: engagementPrev || null },
      revenue: { value: Math.round(incomeBetween(from, today) * 100) / 100, previous: Math.round(incomeBetween(prevFrom, prevTo) * 100) / 100 },
    },
    platforms,
    followersSeries,
    viewsSeries,
    topPosts: top.slice(0, 100),
    engagementRate: viewsOfPosts > 0 ? engagementNow / viewsOfPosts : null,
    previousTotals,
    audience: demo ? demoAudience(connected) : db().read((d) => d.analytics.audience),
  };
}

/** Mode démo : audience simulée, sauf pour une plateforme dont l'audience a été saisie à la main. */
function demoAudience(connected: Set<PlatformId>): Partial<Record<PlatformId, AudienceDemographics>> {
  const saved = db().read((d) => d.analytics.audience);
  const out: Partial<Record<PlatformId, AudienceDemographics>> = {};
  for (const p of PLATFORM_ORDER) {
    if (saved[p]?.source === "manual") out[p] = saved[p];
    else if (connected.has(p) || connected.size === 0) out[p] = { platform: p, source: "demo", updatedAt: Date.now(), ...DEMO_AUDIENCE[p] };
  }
  return out;
}
