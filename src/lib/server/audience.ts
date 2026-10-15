import "server-only";
import { normalize } from "../influence";
import { AGE_BUCKETS, type AgeBucket, type AudienceDemographics, type PlatformId } from "../types";
import { db } from "./store";

const pct = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0);

/**
 * Audience saisie à la main (TikTok ne la fournit pas par API : on recopie les chiffres de TikTok Studio).
 * Entrée en pourcentages (0 → 100), stockée en fractions.
 */
export function sanitizeManualAudience(platform: PlatformId, body: unknown): AudienceDemographics {
  const b = (body ?? {}) as { gender?: Record<string, unknown>; ages?: Record<string, unknown>; countries?: unknown };
  const gender = b.gender ? normalize({ female: pct(b.gender.female), male: pct(b.gender.male), other: pct(b.gender.other) }) : null;
  const ages = b.ages ? normalize(Object.fromEntries(AGE_BUCKETS.map((k) => [k, pct(b.ages![k])])) as Record<AgeBucket, number>) : null;
  let countries = (Array.isArray(b.countries) ? b.countries : [])
    .map((c) => ({ code: String((c as { code?: unknown })?.code ?? "").trim().toUpperCase(), share: pct((c as { share?: unknown })?.share) / 100 }))
    .filter((c) => /^[A-Z]{2}$/.test(c.code) && c.share > 0)
    .slice(0, 30);
  const seen = new Set<string>();
  countries = countries.filter((c) => !seen.has(c.code) && seen.add(c.code));
  const total = countries.reduce((n, c) => n + c.share, 0);
  if (total > 1) countries = countries.map((c) => ({ ...c, share: c.share / total }));
  countries.sort((x, y) => y.share - x.share);
  if (!gender && !ages && !countries.length) throw new Error("Renseignez au moins le genre, l'âge ou un pays.");
  return {
    platform,
    source: "manual",
    basis: "followers",
    updatedAt: Date.now(),
    gender: gender ? { female: gender.female ?? 0, male: gender.male ?? 0, other: gender.other ?? 0 } : undefined,
    ages: ages ?? undefined,
    countries: countries.length ? countries : undefined,
  };
}

export function saveManualAudience(platform: PlatformId, body: unknown): AudienceDemographics {
  const audience = sanitizeManualAudience(platform, body);
  db().update((d) => {
    d.analytics.audience[platform] = audience;
  });
  return audience;
}

export function clearAudience(platform: PlatformId): void {
  db().update((d) => {
    delete d.analytics.audience[platform];
  });
}
