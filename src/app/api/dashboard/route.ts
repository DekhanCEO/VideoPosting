import { listPublicAccounts } from "@/lib/server/accounts";
import { getAnalyticsSummary } from "@/lib/server/analytics";
import { json, route } from "@/lib/server/api";
import { listPosts } from "@/lib/server/posts";
import { getRevenueSummary } from "@/lib/server/revenue";
import { getSettings } from "@/lib/server/store";
import { withMedia } from "@/lib/server/views";
import { PLATFORM_ORDER } from "@/lib/platforms";
import { isoDay } from "@/lib/dates";
import type { DashboardData } from "@/lib/types";

export const GET = route(async () => {
  const settings = getSettings();
  const posts = listPosts();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const lastMonthStart = isoDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = isoDay(new Date(now.getFullYear(), now.getMonth(), 0));

  const count = (s: string) => posts.filter((p) => p.status === s).length;
  const allPubs = posts.flatMap((p) => Object.values(p.publications)).filter(Boolean);
  const finished = allPubs.filter((p) => p!.status === "published" || p!.status === "failed");

  const analytics = getAnalyticsSummary(28);
  const revenue = getRevenueSummary({});
  const lastMonth = getRevenueSummary({ from: lastMonthStart, to: lastMonthEnd });

  const data: DashboardData = {
    demo: settings.demoMode,
    counts: {
      drafts: count("draft"),
      scheduled: count("scheduled"),
      publishing: count("publishing"),
      published: count("published") + count("partial"),
      failed: count("failed"),
      thisMonth: posts.filter((p) => (p.publishedAt ?? 0) >= monthStart).length,
    },
    upcoming: posts
      .filter((p) => p.status === "scheduled")
      .sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0))
      .slice(0, 5)
      .map(withMedia),
    recent: posts
      .filter((p) => p.status !== "draft" && p.status !== "scheduled")
      .sort((a, b) => (b.publishedAt ?? b.updatedAt) - (a.publishedAt ?? a.updatedAt))
      .slice(0, 6)
      .map(withMedia),
    accounts: listPublicAccounts(),
    audience: {
      total: analytics.kpis.followers.value,
      delta: analytics.kpis.followers.previous === null ? null : analytics.kpis.followers.value - analytics.kpis.followers.previous,
      series: analytics.followersSeries.map((p) => ({
        date: p.date,
        value: PLATFORM_ORDER.reduce((n, k) => n + (p[k] ?? 0), 0),
      })),
    },
    revenue: {
      thisMonth: revenue.totals.thisMonth,
      goal: settings.monthlyRevenueGoal,
      currency: settings.currency,
      lastMonth: lastMonth.totals.income,
    },
    successRate: finished.length ? finished.filter((p) => p!.status === "published").length / finished.length : null,
  };
  return json(data);
});
