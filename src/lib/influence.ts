/**
 * Taux d'influence et audience : calculs partagés par l'interface et le serveur.
 *
 * Taux d'influence d'une vidéo = interactions pondérées ÷ vues.
 * Les actions qui demandent le plus d'implication (et qui diffusent la vidéo au-delà de l'audience)
 * comptent davantage : partage ×3, commentaire ×2, enregistrement ×2, j'aime ×1.
 * « 8 % » signifie : pour 100 vues, l'équivalent de 8 actions d'influence.
 */
import { AGE_BUCKETS, type AgeBucket, type AudienceDemographics, type MetricTotals, type PlatformId } from "./types";

export const INFLUENCE_WEIGHTS = { likes: 1, comments: 2, shares: 3, saves: 2 } as const;
export type InfluenceAction = keyof typeof INFLUENCE_WEIGHTS;
export const INFLUENCE_ACTIONS: InfluenceAction[] = ["likes", "comments", "shares", "saves"];
export const INFLUENCE_ACTION_LABELS: Record<InfluenceAction, string> = {
  likes: "J'aime",
  comments: "Commentaires",
  shares: "Partages",
  saves: "Enregistrements",
};

type Interactions = { likes: number; comments: number; shares: number; saves?: number };

export function emptyTotals(): MetricTotals {
  return { videos: 0, views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
}

export function addToTotals(t: MetricTotals, m: Interactions & { views: number }): MetricTotals {
  t.videos += 1;
  t.views += m.views;
  t.likes += m.likes;
  t.comments += m.comments;
  t.shares += m.shares;
  t.saves += m.saves ?? 0;
  return t;
}

/** Contribution pondérée de chaque type d'action. */
export function influenceBreakdown(m: Interactions): Record<InfluenceAction, number> {
  return {
    likes: m.likes * INFLUENCE_WEIGHTS.likes,
    comments: m.comments * INFLUENCE_WEIGHTS.comments,
    shares: m.shares * INFLUENCE_WEIGHTS.shares,
    saves: (m.saves ?? 0) * INFLUENCE_WEIGHTS.saves,
  };
}

export function weightedInteractions(m: Interactions): number {
  const b = influenceBreakdown(m);
  return b.likes + b.comments + b.shares + b.saves;
}

/** Taux d'influence (fraction) ; null tant que la vidéo n'a pas de vues mesurées. */
export function influenceRate(m: Interactions & { views: number }): number | null {
  if (!(m.views > 0)) return null;
  return weightedInteractions(m) / m.views;
}

/** Portée : vues rapportées au nombre d'abonnés (×1 = autant de vues que d'abonnés). */
export function reachRatio(views: number, followers: number | null | undefined): number | null {
  if (!followers || followers <= 0) return null;
  return views / followers;
}

export type InfluenceLevel = "top" | "above" | "average" | "below";

/** Position d'une vidéo par rapport à la moyenne du créateur sur la même plateforme. */
export function influenceLevel(rate: number | null, average: number | null): InfluenceLevel | null {
  if (rate === null || average === null || average <= 0) return null;
  const r = rate / average;
  if (r >= 1.5) return "top";
  if (r >= 1.1) return "above";
  if (r >= 0.9) return "average";
  return "below";
}

export const INFLUENCE_LEVEL_LABELS: Record<InfluenceLevel, string> = {
  top: "Exceptionnelle",
  above: "Au-dessus de votre moyenne",
  average: "Dans votre moyenne",
  below: "En dessous de votre moyenne",
};

/* ------------------------------------------------------------------ */
/* Audience                                                            */
/* ------------------------------------------------------------------ */

const AGE_MIDPOINTS: Record<AgeBucket, number> = {
  "13-17": 15.5,
  "18-24": 21.5,
  "25-34": 30,
  "35-44": 40,
  "45-54": 50,
  "55-64": 60,
  "65+": 70,
};

/** Âge moyen estimé à partir des tranches (milieu de chaque tranche). */
export function averageAge(ages: Partial<Record<AgeBucket, number>> | undefined): number | null {
  if (!ages) return null;
  let sum = 0;
  let weight = 0;
  for (const b of AGE_BUCKETS) {
    const share = ages[b] ?? 0;
    sum += share * AGE_MIDPOINTS[b];
    weight += share;
  }
  return weight > 0 ? sum / weight : null;
}

export function dominantAge(ages: Partial<Record<AgeBucket, number>> | undefined): AgeBucket | null {
  if (!ages) return null;
  let best: AgeBucket | null = null;
  for (const b of AGE_BUCKETS) if ((ages[b] ?? 0) > 0 && (best === null || (ages[b] ?? 0) > (ages[best] ?? 0))) best = b;
  return best;
}

/** Ramène des valeurs positives à des fractions dont la somme vaut 1 (null si tout est nul). */
export function normalize<K extends string>(values: Partial<Record<K, number>>): Partial<Record<K, number>> | null {
  const entries = Object.entries(values).filter(([, v]) => typeof v === "number" && Number.isFinite(v) && (v as number) > 0) as [K, number][];
  const total = entries.reduce((n, [, v]) => n + v, 0);
  if (total <= 0) return null;
  return Object.fromEntries(entries.map(([k, v]) => [k, v / total])) as Partial<Record<K, number>>;
}

export interface CombinedAudience {
  platforms: PlatformId[];
  gender?: { female: number; male: number; other: number };
  ages?: Partial<Record<AgeBucket, number>>;
  countries?: { code: string; share: number }[];
}

/**
 * Moyenne de plusieurs audiences, pondérée par la taille de chaque audience (abonnés).
 * Chaque répartition (genre, âge, pays) n'utilise que les plateformes qui la fournissent.
 */
export function combineAudiences(items: { audience: AudienceDemographics; weight: number }[]): CombinedAudience | null {
  const usable = items.filter((i) => i.weight > 0);
  if (!usable.length) return null;
  const blend = <T,>(pick: (a: AudienceDemographics) => T | undefined, merge: (acc: Map<string, number>, value: T, w: number) => void) => {
    const withField = usable.filter((i) => pick(i.audience) !== undefined);
    const total = withField.reduce((n, i) => n + i.weight, 0);
    if (!total) return null;
    const acc = new Map<string, number>();
    for (const i of withField) merge(acc, pick(i.audience)!, i.weight / total);
    return acc;
  };
  const out: CombinedAudience = { platforms: usable.map((i) => i.audience.platform) };

  const g = blend(
    (a) => a.gender,
    (acc, v, w) => {
      for (const k of ["female", "male", "other"] as const) acc.set(k, (acc.get(k) ?? 0) + v[k] * w);
    },
  );
  if (g) out.gender = { female: g.get("female") ?? 0, male: g.get("male") ?? 0, other: g.get("other") ?? 0 };

  const a = blend(
    (x) => x.ages,
    (acc, v, w) => {
      for (const b of AGE_BUCKETS) acc.set(b, (acc.get(b) ?? 0) + (v[b] ?? 0) * w);
    },
  );
  if (a) out.ages = Object.fromEntries(AGE_BUCKETS.map((b) => [b, a.get(b) ?? 0]));

  const c = blend(
    (x) => x.countries,
    (acc, v, w) => {
      for (const { code, share } of v) acc.set(code, (acc.get(code) ?? 0) + share * w);
    },
  );
  if (c) out.countries = [...c.entries()].map(([code, share]) => ({ code, share })).sort((x, y) => y.share - x.share);

  return out;
}

/** Nom du pays en français à partir du code ISO (ex. « FR » → « France »). */
export function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Drapeau emoji à partir du code ISO. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🏳️";
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
