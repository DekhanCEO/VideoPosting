import assert from "node:assert/strict";
import { test } from "node:test";
import { tiktokChunks } from "../src/lib/chunks";
import { addDays, daysBetween, lastMonths } from "../src/lib/dates";
import { createSessionToken, passwordMatches, verifySessionToken } from "../src/lib/session";

const MB = 1024 * 1024;

test("TikTok : un seul morceau sous 5 Mo", () => {
  const r = tiktokChunks(3 * MB);
  assert.equal(r.count, 1);
  assert.deepEqual(r.ranges, [[0, 3 * MB - 1]]);
});

test("TikTok : le dernier morceau absorbe le reste et les plages sont contiguës", () => {
  const size = 23 * MB + 123;
  const r = tiktokChunks(size);
  assert.equal(r.count, Math.floor(size / r.chunkSize));
  assert.equal(r.ranges[0][0], 0);
  assert.equal(r.ranges[r.ranges.length - 1][1], size - 1);
  for (let i = 1; i < r.ranges.length; i++) assert.equal(r.ranges[i][0], r.ranges[i - 1][1] + 1);
  const last = r.ranges[r.ranges.length - 1];
  assert.ok(last[1] - last[0] + 1 < 128 * MB);
  assert.ok(r.chunkSize >= 5 * MB && r.chunkSize <= 64 * MB);
});

test("dates : intervalle de jours et mois glissants", () => {
  assert.equal(addDays("2026-02-27", 2), "2026-03-01");
  assert.deepEqual(daysBetween("2026-12-30", "2027-01-02"), ["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
  assert.deepEqual(lastMonths("2026-03-15", 4), ["2025-12", "2026-01", "2026-02", "2026-03"]);
});

test("session : jeton signé valide pour le bon mot de passe uniquement", async () => {
  const token = await createSessionToken("secret");
  assert.equal(await verifySessionToken("secret", token), true);
  assert.equal(await verifySessionToken("autre", token), false);
  assert.equal(await verifySessionToken("secret", token.replace(/.$/, "x")), false);
  assert.equal(await verifySessionToken("secret", "123.abc"), false);
  assert.equal(await passwordMatches("secret", "secret"), true);
  assert.equal(await passwordMatches("secret", "Secret"), false);
});

test("TikTok : les identifiants 64 bits restent exacts", async () => {
  const { parseTiktokJson } = await import("../src/lib/tiktok-json");
  const parsed = parseTiktokJson('{"data":{"status":"PUBLISH_COMPLETE","publicaly_available_post_id":[7300000000000000001, 7300000000000000003]},"error":{"code":"ok"}}') as {
    data: { publicaly_available_post_id: string[] };
  };
  assert.deepEqual(parsed.data.publicaly_available_post_id, ["7300000000000000001", "7300000000000000003"]);
  assert.equal(parseTiktokJson(""), null);
});
