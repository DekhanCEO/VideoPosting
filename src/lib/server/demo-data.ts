import "server-only";
import crypto from "node:crypto";
import { addDays, isoDay, parseDay } from "../dates";
import type { AccountSnapshot, AudienceDemographics, DailyMetric, PlatformId, PostMetrics, RevenueEntry } from "../types";

/**
 * Données fictives mais cohérentes pour le mode démo : elles sont recalculées
 * à la volée (déterministes) pour rester alignées sur la date du jour.
 */

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  return crypto.createHash("sha1").update(text).digest().readUInt32BE(0);
}

const PROFILE: Record<PlatformId, { followers: number; growth: number; views: number; rpm: number; likesRatio: number }> = {
  tiktok: { followers: 14000, growth: 62, views: 21000, rpm: 0, likesRatio: 0.085 },
  youtube: { followers: 3500, growth: 13, views: 4200, rpm: 2.4, likesRatio: 0.04 },
  instagram: { followers: 7000, growth: 30, views: 7600, rpm: 0, likesRatio: 0.06 },
};

const DAYS = 800;

let cache: { day: string; snapshots: AccountSnapshot[]; daily: DailyMetric[] } | null = null;

export function demoSeries(): { snapshots: AccountSnapshot[]; daily: DailyMetric[] } {
  const today = isoDay();
  if (cache?.day === today) return cache;
  const snapshots: AccountSnapshot[] = [];
  const daily: DailyMetric[] = [];
  const start = addDays(today, -DAYS + 1);

  for (const platform of Object.keys(PROFILE) as PlatformId[]) {
    const p = PROFILE[platform];
    // On fixe la graine sur la plateforme et le jour de début pour garder des courbes stables.
    const rand = rng(hash(`${platform}`));
    let followers = p.followers;
    let totalViews = p.views * 400;
    let totalLikes = Math.round(totalViews * p.likesRatio);
    let videoCount = platform === "youtube" ? 84 : platform === "tiktok" ? 212 : 160;
    let viralBoost = 0;

    for (let i = 0; i < DAYS; i++) {
      const date = addDays(start, i);
      const weekday = parseDay(date).getDay();
      const weekend = weekday === 0 || weekday === 6 ? 1.18 : 1;
      if (rand() < 0.025) viralBoost = 2 + rand() * (platform === "tiktok" ? 9 : 4);
      const trend = 1 + i / DAYS; // la chaîne grandit au fil de l'année
      const views = Math.round(p.views * trend * weekend * (0.75 + rand() * 0.5) * (1 + viralBoost));
      const gained = Math.round(p.growth * trend * (0.6 + rand() * 0.8) * (1 + viralBoost * 0.8) - rand() * p.growth * 0.25);
      viralBoost *= 0.62;
      if (viralBoost < 0.05) viralBoost = 0;
      followers += gained;
      totalViews += views;
      totalLikes += Math.round(views * p.likesRatio * (0.8 + rand() * 0.4));
      if (rand() < (platform === "youtube" ? 0.12 : 0.4)) videoCount++;

      snapshots.push({ platform, date, followers, totalViews, totalLikes, videoCount, demo: true });
      daily.push({
        platform,
        date,
        views,
        followersGained: gained,
        watchMinutes: platform === "youtube" ? Math.round(views * (1.6 + rand())) : undefined,
        revenue: p.rpm ? Math.round(((views / 1000) * p.rpm * (0.8 + rand() * 0.4)) * 100) / 100 : undefined,
        demo: true,
      });
    }
  }
  cache = { day: today, snapshots, daily };
  return cache;
}

/** Métriques plausibles pour une vidéo publiée en démo, qui augmentent avec le temps. */
export function demoPostMetrics(postId: string, platform: PlatformId, publishedAt: number): PostMetrics {
  const rand = rng(hash(`${postId}:${platform}`));
  const hours = Math.max(0, (Date.now() - publishedAt) / 3600_000);
  const potential = { tiktok: 42000, youtube: 9000, instagram: 16000 }[platform] * (0.3 + rand() * 2.2);
  const curve = 1 - Math.exp(-hours / 30);
  const views = Math.round(potential * curve + Math.min(hours, 1) * 40 * rand());
  return {
    views,
    likes: Math.round(views * (0.04 + rand() * 0.07)),
    comments: Math.round(views * (0.002 + rand() * 0.006)),
    shares: Math.round(views * (0.002 + rand() * 0.01)),
    saves: Math.round(views * (0.003 + rand() * 0.012)),
    updatedAt: Date.now(),
  };
}

/** Vidéos fictives affichées dans le classement tant que rien n'a été publié en démo. */
export const DEMO_TOP_POSTS: { title: string; daysAgo: number; platforms: PlatformId[] }[] = [
  { title: "Ma routine du matin en 30 secondes ☀️", daysAgo: 3, platforms: ["tiktok", "instagram", "youtube"] },
  { title: "3 erreurs que tout le monde fait en montage", daysAgo: 9, platforms: ["tiktok", "youtube"] },
  { title: "J'ai testé le setup à 100 € vs 1000 €", daysAgo: 16, platforms: ["youtube", "instagram"] },
  { title: "Behind the scenes : tournage d'une pub", daysAgo: 22, platforms: ["tiktok", "instagram"] },
  { title: "Comment j'ai atteint 10 000 abonnés", daysAgo: 41, platforms: ["youtube", "tiktok", "instagram"] },
  { title: "La lumière parfaite avec une seule lampe", daysAgo: 63, platforms: ["instagram", "tiktok"] },
];

/** Écritures de revenus et dépenses d'exemple sur les 24 derniers mois. */
export function demoRevenueEntries(): RevenueEntry[] {
  const rand = rng(424242);
  const today = isoDay();
  const entries: RevenueEntry[] = [];
  const now = Date.now();
  const push = (e: Omit<RevenueEntry, "id" | "createdAt" | "demo">) =>
    entries.push({ ...e, id: crypto.randomUUID(), createdAt: now, demo: true });

  const brands = ["Nike", "Samsung", "Hello Bank!", "Sephora", "NordVPN", "Decathlon", "Fnac", "Canva", "HelloFresh"];
  for (let m = 23; m >= 0; m--) {
    const monthStart = parseDay(today);
    monthStart.setDate(1);
    monthStart.setMonth(monthStart.getMonth() - m);
    const day = (n: number) => {
      const d = new Date(monthStart);
      d.setDate(Math.min(n, 28));
      const s = isoDay(d);
      return s > today ? today : s;
    };
    const growth = 0.55 + (23 - m) * 0.045;

    const deals = rand() < 0.35 ? 2 : 1;
    for (let k = 0; k < deals; k++) {
      const brand = brands[Math.floor(rand() * brands.length)];
      push({
        kind: "income",
        date: day(5 + Math.floor(rand() * 20)),
        amount: Math.round((350 + rand() * 1500) * growth / 10) * 10,
        category: "sponsorship",
        platform: (["tiktok", "instagram", "youtube"] as const)[Math.floor(rand() * 3)],
        label: `Partenariat ${brand}`,
        partner: brand,
        status: m === 0 && k === 0 ? "pending" : "received",
      });
    }
    push({
      kind: "income",
      date: day(12),
      amount: Math.round((90 + rand() * 260) * growth),
      category: "creator_fund",
      platform: "tiktok",
      label: "TikTok Creator Rewards",
      status: m === 0 ? "pending" : "received",
    });
    push({
      kind: "income",
      date: day(18),
      amount: Math.round((40 + rand() * 180) * growth),
      category: "affiliate",
      platform: "instagram",
      label: "Commissions d'affiliation Amazon",
      status: "received",
    });
    if (rand() < 0.4) {
      push({
        kind: "income",
        date: day(22),
        amount: Math.round(120 + rand() * 450),
        category: "merch",
        platform: "other",
        label: "Ventes boutique (sweats & presets)",
        status: "received",
      });
    }
    if (rand() < 0.5) {
      push({
        kind: "income",
        date: day(26),
        amount: Math.round(15 + rand() * 60),
        category: "tips",
        platform: "youtube",
        label: "Super Thanks & dons",
        status: "received",
      });
    }
    push({ kind: "expense", date: day(2), amount: 11.99, category: "software", label: "CapCut Pro", status: "received" });
    push({ kind: "expense", date: day(3), amount: 14.99, category: "software", label: "Epidemic Sound", status: "received" });
    if (rand() < 0.25) {
      push({
        kind: "expense",
        date: day(15),
        amount: Math.round(80 + rand() * 600),
        category: (["equipment", "freelance", "travel"] as const)[Math.floor(rand() * 3)],
        label: ["Micro sans fil", "Monteur freelance", "Déplacement tournage"][Math.floor(rand() * 3)],
        status: "received",
      });
    }
  }
  return entries;
}

/** Audience fictive mais réaliste (TikTok plus jeune, YouTube plus masculin, Instagram 18-34 ans). */
export const DEMO_AUDIENCE: Record<PlatformId, Pick<AudienceDemographics, "basis" | "gender" | "ages" | "countries" | "cities">> = {
  tiktok: {
    basis: "followers",
    gender: { female: 0.58, male: 0.39, other: 0.03 },
    ages: { "13-17": 0.14, "18-24": 0.41, "25-34": 0.27, "35-44": 0.11, "45-54": 0.05, "55-64": 0.015, "65+": 0.005 },
    countries: [
      { code: "FR", share: 0.62 },
      { code: "BE", share: 0.08 },
      { code: "CA", share: 0.06 },
      { code: "CH", share: 0.05 },
      { code: "MA", share: 0.04 },
      { code: "DZ", share: 0.03 },
      { code: "SN", share: 0.02 },
      { code: "CI", share: 0.02 },
      { code: "US", share: 0.02 },
    ],
  },
  youtube: {
    basis: "viewers",
    gender: { female: 0.36, male: 0.62, other: 0.02 },
    ages: { "13-17": 0.06, "18-24": 0.29, "25-34": 0.34, "35-44": 0.18, "45-54": 0.08, "55-64": 0.03, "65+": 0.02 },
    countries: [
      { code: "FR", share: 0.55 },
      { code: "CA", share: 0.09 },
      { code: "BE", share: 0.07 },
      { code: "CH", share: 0.06 },
      { code: "US", share: 0.05 },
      { code: "MA", share: 0.03 },
      { code: "DE", share: 0.02 },
      { code: "GB", share: 0.02 },
    ],
  },
  instagram: {
    basis: "followers",
    gender: { female: 0.64, male: 0.34, other: 0.02 },
    ages: { "13-17": 0.05, "18-24": 0.36, "25-34": 0.37, "35-44": 0.14, "45-54": 0.05, "55-64": 0.02, "65+": 0.01 },
    countries: [
      { code: "FR", share: 0.68 },
      { code: "BE", share: 0.07 },
      { code: "CH", share: 0.06 },
      { code: "CA", share: 0.05 },
      { code: "MA", share: 0.03 },
      { code: "LU", share: 0.02 },
      { code: "ES", share: 0.02 },
    ],
    cities: [
      { name: "Paris", share: 0.18 },
      { name: "Lyon", share: 0.07 },
      { name: "Marseille", share: 0.05 },
      { name: "Bruxelles", share: 0.04 },
      { name: "Montréal", share: 0.03 },
      { name: "Bordeaux", share: 0.03 },
    ],
  },
};
