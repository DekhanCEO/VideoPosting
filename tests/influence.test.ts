import assert from "node:assert/strict";
import { test } from "node:test";
import {
  addToTotals,
  averageAge,
  combineAudiences,
  countryFlag,
  dominantAge,
  emptyTotals,
  influenceLevel,
  influenceRate,
  normalize,
  reachRatio,
  weightedInteractions,
} from "../src/lib/influence";
import type { AudienceDemographics } from "../src/lib/types";

test("taux d'influence : interactions pondérées ÷ vues", () => {
  const m = { views: 1000, likes: 50, comments: 10, shares: 5, saves: 5 };
  assert.equal(weightedInteractions(m), 50 + 20 + 15 + 10);
  assert.equal(influenceRate(m), 0.095);
  assert.equal(influenceRate({ ...m, views: 0 }), null, "pas de vues → pas de taux");
  assert.equal(influenceRate({ views: 200, likes: 10, comments: 0, shares: 0 }), 0.05, "enregistrements facultatifs");
});

test("taux agrégé d'une plateforme et niveau par rapport à la moyenne", () => {
  const t = emptyTotals();
  addToTotals(t, { views: 1000, likes: 100, comments: 0, shares: 0 });
  addToTotals(t, { views: 3000, likes: 100, comments: 0, shares: 0 });
  assert.equal(t.videos, 2);
  assert.equal(influenceRate(t), 0.05, "moyenne pondérée par les vues");
  assert.equal(influenceLevel(0.1, 0.05), "top");
  assert.equal(influenceLevel(0.056, 0.05), "above");
  assert.equal(influenceLevel(0.05, 0.05), "average");
  assert.equal(influenceLevel(0.01, 0.05), "below");
  assert.equal(influenceLevel(null, 0.05), null);
  assert.equal(reachRatio(5000, 2000), 2.5);
  assert.equal(reachRatio(5000, 0), null);
});

test("âge moyen et tranche principale", () => {
  const ages = { "18-24": 0.5, "25-34": 0.5 };
  assert.equal(averageAge(ages), (21.5 + 30) / 2);
  assert.equal(dominantAge({ "13-17": 0.1, "18-24": 0.6, "25-34": 0.3 }), "18-24");
  assert.equal(averageAge({}), null);
  assert.deepEqual(normalize({ a: 30, b: 10, c: 0 }), { a: 0.75, b: 0.25 });
  assert.equal(normalize({ a: 0 }), null);
});

test("audience combinée pondérée par les abonnés, champ par champ", () => {
  const base = { source: "api", basis: "followers", updatedAt: 0 } as const;
  const tiktok: AudienceDemographics = { ...base, platform: "tiktok", gender: { female: 0.8, male: 0.2, other: 0 }, countries: [{ code: "FR", share: 1 }] };
  const youtube: AudienceDemographics = {
    ...base,
    platform: "youtube",
    gender: { female: 0.2, male: 0.8, other: 0 },
    ages: { "25-34": 1 },
    countries: [{ code: "BE", share: 1 }],
  };
  const c = combineAudiences([
    { audience: tiktok, weight: 3000 },
    { audience: youtube, weight: 1000 },
  ])!;
  assert.deepEqual(c.platforms, ["tiktok", "youtube"]);
  assert.ok(Math.abs(c.gender!.female - 0.65) < 1e-9);
  assert.deepEqual(c.ages!["25-34"], 1, "seul YouTube fournit l'âge");
  assert.deepEqual(c.countries!.map((x) => x.code), ["FR", "BE"]);
  assert.ok(Math.abs(c.countries![0].share - 0.75) < 1e-9);
  assert.equal(combineAudiences([{ audience: tiktok, weight: 0 }]), null);
});

test("drapeaux", () => {
  assert.equal(countryFlag("fr"), "🇫🇷");
  assert.equal(countryFlag("??"), "🏳️");
});
