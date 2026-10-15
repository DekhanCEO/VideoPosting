import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { addDays, isoDay, lastMonths, monthKey, parseDay } from "../dates";
import { revenueEstimates, viewEstimateEntries } from "../revenue-estimates";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type RevenueEntry, type RevenuePlatform, type RevenueSummary } from "../types";
import { demoRevenueEntries, demoSeries } from "./demo-data";
import { db, getSettings } from "./store";

export const revenueInputSchema = z
  .object({
    kind: z.enum(["income", "expense"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    amount: z.number().positive().max(10_000_000),
    category: z.enum([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES]),
    platform: z.enum(["tiktok", "youtube", "instagram", "twitch", "other"]).optional(),
    label: z.string().trim().min(1).max(120),
    partner: z.string().trim().max(120).optional(),
    postId: z.string().uuid().optional(),
    status: z.enum(["received", "pending"]),
    note: z.string().max(1000).optional(),
  })
  .refine(
    (v) =>
      v.kind === "income"
        ? (INCOME_CATEGORIES as readonly string[]).includes(v.category)
        : (EXPENSE_CATEGORIES as readonly string[]).includes(v.category),
    { message: "Catégorie incompatible avec le type d'écriture." },
  );

export type RevenueInput = z.infer<typeof revenueInputSchema>;

function ensureDemoSeed() {
  const settings = getSettings();
  if (!settings.demoMode) return;
  const seeded = db().read((d) => d.demoRevenueSeeded);
  if (seeded) return;
  db().update((d) => {
    d.revenues.push(...demoRevenueEntries());
    d.demoRevenueSeeded = true;
  });
}

function manualEntries(): RevenueEntry[] {
  ensureDemoSeed();
  return db().read((d) => d.revenues.filter((r) => !!r.demo === d.settings.demoMode));
}

/** Revenus publicitaires YouTube estimés (YouTube Analytics), regroupés par mois. */
function youtubeAdsEntries(): RevenueEntry[] {
  const demo = getSettings().demoMode;
  const daily = demo ? demoSeries().daily : db().read((d) => d.analytics.daily.filter((m) => !m.demo));
  const byMonth = new Map<string, { amount: number; lastDay: string }>();
  for (const m of daily) {
    if (m.platform !== "youtube" || !m.revenue) continue;
    const key = monthKey(m.date);
    const cur = byMonth.get(key) ?? { amount: 0, lastDay: m.date };
    cur.amount += m.revenue;
    if (m.date > cur.lastDay) cur.lastDay = m.date;
    byMonth.set(key, cur);
  }
  return [...byMonth.entries()].map(([month, v]) => ({
    id: `yt-ads-${month}`,
    kind: "income" as const,
    date: v.lastDay,
    amount: Math.round(v.amount * 100) / 100,
    category: "ads" as const,
    platform: "youtube" as const,
    label: "Revenus publicitaires YouTube (estimés)",
    status: "received" as const,
    auto: true,
    demo,
    createdAt: 0,
  }));
}

/** Estimations TikTok / Instagram (vues × RPM choisi dans les réglages des revenus). */
function estimatedEntries(): RevenueEntry[] {
  const settings = getSettings();
  const demo = settings.demoMode;
  const { snapshots, daily } = demo
    ? demoSeries()
    : db().read((d) => ({ snapshots: d.analytics.snapshots.filter((s) => !s.demo), daily: d.analytics.daily.filter((m) => !m.demo) }));
  return viewEstimateEntries(snapshots, daily, revenueEstimates(settings.revenueEstimates), { demo, today: isoDay() });
}

export function allRevenueEntries(): RevenueEntry[] {
  return [...manualEntries(), ...youtubeAdsEntries(), ...estimatedEntries()].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

export function getRevenueSummary(params: { from?: string; to?: string }): RevenueSummary {
  const settings = getSettings();
  const to = params.to ?? isoDay();
  const from = params.from ?? addDays(to, -364);
  const spanDays = Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86400_000) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(spanDays - 1));
  const all = allRevenueEntries();

  const inRange = all.filter((e) => e.date >= from && e.date <= to);
  const sum = (list: RevenueEntry[]) => Math.round(list.reduce((n, e) => n + e.amount, 0) * 100) / 100;
  const income = inRange.filter((e) => e.kind === "income");
  const expenses = inRange.filter((e) => e.kind === "expense");
  const currentMonth = monthKey(isoDay());

  const months = lastMonths(to, 12);
  const byMonth = months.map((month) => {
    const list = all.filter((e) => monthKey(e.date) === month);
    const incomeByCat: Record<string, number> = {};
    for (const e of list) {
      if (e.kind !== "income") continue;
      incomeByCat[e.category] = Math.round(((incomeByCat[e.category] ?? 0) + e.amount) * 100) / 100;
    }
    return { month, income: incomeByCat, expenses: sum(list.filter((e) => e.kind === "expense")) };
  });

  const catMap = new Map<RevenueEntry["category"], number>();
  const platMap = new Map<RevenuePlatform, number>();
  for (const e of income) {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
    const p = e.platform ?? "other";
    platMap.set(p, (platMap.get(p) ?? 0) + e.amount);
  }

  return {
    currency: settings.currency,
    monthlyGoal: settings.monthlyRevenueGoal,
    from,
    to,
    totals: {
      income: sum(income),
      expenses: sum(expenses),
      net: Math.round((sum(income) - sum(expenses)) * 100) / 100,
      pending: sum(income.filter((e) => e.status === "pending")),
      incomePrevious: sum(all.filter((e) => e.kind === "income" && e.date >= prevFrom && e.date <= prevTo)),
      thisMonth: sum(all.filter((e) => e.kind === "income" && monthKey(e.date) === currentMonth)),
    },
    byMonth,
    byCategory: [...catMap.entries()]
      .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount),
    byPlatform: [...platMap.entries()]
      .map(([platform, amount]) => ({ platform, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount),
    entries: inRange,
    youtubeAdsIncluded: inRange.some((e) => e.auto && !e.estimated),
    estimatedIncome: sum(income.filter((e) => e.estimated)),
  };
}

export function incomeBetween(from: string, to: string): number {
  return allRevenueEntries()
    .filter((e) => e.kind === "income" && e.date >= from && e.date <= to)
    .reduce((n, e) => n + e.amount, 0);
}

export function createRevenue(input: RevenueInput): RevenueEntry {
  const entry: RevenueEntry = {
    ...input,
    id: crypto.randomUUID(),
    demo: getSettings().demoMode,
    createdAt: Date.now(),
  };
  db().update((d) => {
    d.revenues.push(entry);
  });
  return entry;
}

export function updateRevenue(id: string, input: RevenueInput): RevenueEntry {
  const updated = db().update((d) => {
    const e = d.revenues.find((r) => r.id === id);
    if (!e) return null;
    Object.assign(e, input);
    return e;
  });
  if (!updated) throw new Error("Écriture introuvable.");
  return updated;
}

export function deleteRevenue(id: string) {
  db().update((d) => {
    d.revenues = d.revenues.filter((r) => r.id !== id);
  });
}

const CSV_LABELS: Record<string, string> = {
  income: "Revenu",
  expense: "Dépense",
  received: "Reçu",
  pending: "En attente",
};

export function revenueCsv(entries: RevenueEntry[]): string {
  const esc = (v: string | number | undefined) => {
    const s = v === undefined ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Date", "Type", "Libellé", "Catégorie", "Plateforme", "Partenaire", "Montant", "Statut", "Note"];
  const rows = entries.map((e) =>
    [
      e.date,
      CSV_LABELS[e.kind],
      e.label,
      e.category,
      e.platform ?? "",
      e.partner ?? "",
      (e.kind === "expense" ? -e.amount : e.amount).toFixed(2).replace(".", ","),
      CSV_LABELS[e.status],
      e.note ?? "",
    ]
      .map(esc)
      .join(";"),
  );
  // BOM pour qu'Excel détecte l'UTF-8.
  return "﻿" + [header.join(";"), ...rows].join("\n");
}
