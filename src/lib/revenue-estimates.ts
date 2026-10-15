/**
 * Estimation des revenus que TikTok et Instagram ne communiquent pas par API :
 * vues du mois × revenu pour 1 000 vues (RPM) choisi par le créateur.
 */
import { monthKey } from "./dates";
import type { AccountSnapshot, DailyMetric, PlatformId, RevenueEntry, RevenueEstimates } from "./types";

export const DEFAULT_REVENUE_ESTIMATES: RevenueEstimates = {
  enabled: true,
  tiktokRpm: 0.5,
  instagramRpm: 0,
  twitchSubValue: 2.5,
  twitchBitValue: 0.01,
};

export function revenueEstimates(value?: Partial<RevenueEstimates> | null): RevenueEstimates {
  return { ...DEFAULT_REVENUE_ESTIMATES, ...(value ?? {}) };
}

/** Vues par jour : métriques quotidiennes si la plateforme les fournit, sinon écart entre deux relevés consécutifs. */
export function dailyViews(snapshots: AccountSnapshot[], daily: DailyMetric[], platform: PlatformId): Map<string, number> {
  const out = new Map<string, number>();
  const list = snapshots.filter((s) => s.platform === platform && s.totalViews !== undefined).sort((a, b) => a.date.localeCompare(b.date));
  for (let i = 1; i < list.length; i++) out.set(list[i].date, Math.max(0, (list[i].totalViews ?? 0) - (list[i - 1].totalViews ?? 0)));
  for (const m of daily) if (m.platform === platform && m.views !== undefined) out.set(m.date, m.views);
  return out;
}

const RPM_PLATFORMS = [
  { platform: "tiktok" as const, key: "tiktokRpm" as const, label: "Programme créateurs TikTok" },
  { platform: "instagram" as const, key: "instagramRpm" as const, label: "Bonus et programmes Instagram" },
];

const money = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Une ligne estimée par mois et par plateforme (statut « en attente » : à remplacer par le montant versé). */
export function viewEstimateEntries(
  snapshots: AccountSnapshot[],
  daily: DailyMetric[],
  settings: RevenueEstimates,
  opts: { demo: boolean; today: string },
): RevenueEntry[] {
  if (!settings.enabled) return [];
  const out: RevenueEntry[] = [];
  for (const { platform, key, label } of RPM_PLATFORMS) {
    const rpm = settings[key];
    if (!(rpm > 0)) continue;
    const byMonth = new Map<string, { views: number; last: string }>();
    for (const [date, views] of dailyViews(snapshots, daily, platform)) {
      if (date > opts.today) continue;
      const k = monthKey(date);
      const cur = byMonth.get(k) ?? { views: 0, last: date };
      cur.views += views;
      if (date > cur.last) cur.last = date;
      byMonth.set(k, cur);
    }
    for (const [month, v] of byMonth) {
      const amount = Math.round((v.views / 1000) * rpm * 100) / 100;
      if (amount < 0.01) continue;
      out.push({
        id: `est-${platform}-${month}`,
        kind: "income",
        date: v.last,
        amount,
        category: "creator_fund",
        platform,
        label: `${label} (estimé)`,
        note: `${v.views.toLocaleString("fr-FR")} vues × ${money(rpm)} pour 1 000 vues`,
        status: "pending",
        auto: true,
        estimated: true,
        demo: opts.demo,
        createdAt: 0,
      });
    }
  }
  return out;
}
