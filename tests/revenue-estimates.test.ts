import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyViews, revenueEstimates, viewEstimateEntries } from "../src/lib/revenue-estimates";
import type { AccountSnapshot, DailyMetric } from "../src/lib/types";

const snaps: AccountSnapshot[] = [
  { platform: "tiktok", date: "2026-09-29", followers: 1, totalViews: 1000 },
  { platform: "tiktok", date: "2026-09-30", followers: 1, totalViews: 3000 },
  { platform: "tiktok", date: "2026-10-01", followers: 1, totalViews: 7000 },
  { platform: "tiktok", date: "2026-10-02", followers: 1, totalViews: 6500 }, // baisse : jamais négatif
  { platform: "instagram", date: "2026-10-01", followers: 1, totalViews: 500 },
];
const daily: DailyMetric[] = [{ platform: "instagram", date: "2026-10-02", views: 20000 }];

test("vues par jour : écarts entre relevés, métriques quotidiennes prioritaires", () => {
  assert.deepEqual([...dailyViews(snaps, daily, "tiktok")], [["2026-09-30", 2000], ["2026-10-01", 4000], ["2026-10-02", 0]]);
  assert.deepEqual([...dailyViews(snaps, daily, "instagram")], [["2026-10-02", 20000]]);
});

test("estimations mensuelles : vues × RPM, désactivables", () => {
  const est = revenueEstimates({ tiktokRpm: 0.5, instagramRpm: 1 });
  const entries = viewEstimateEntries(snaps, daily, est, { demo: false, today: "2026-10-15" });
  const byId = Object.fromEntries(entries.map((e) => [e.id, e]));
  assert.equal(byId["est-tiktok-2026-09"].amount, 1);
  assert.equal(byId["est-tiktok-2026-10"].amount, 2);
  assert.equal(byId["est-instagram-2026-10"].amount, 20);
  assert.ok(entries.every((e) => e.estimated && e.status === "pending" && e.category === "creator_fund"));
  assert.equal(byId["est-tiktok-2026-10"].date, "2026-10-02");
  assert.deepEqual(viewEstimateEntries(snaps, daily, { ...est, enabled: false }, { demo: false, today: "2026-10-15" }), []);
  assert.ok(!viewEstimateEntries(snaps, daily, revenueEstimates({ instagramRpm: 0 }), { demo: false, today: "2026-10-15" }).some((e) => e.platform === "instagram"));
});
