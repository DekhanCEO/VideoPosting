import { getAnalyticsSummary } from "@/lib/server/analytics";
import { json, route } from "@/lib/server/api";
import type { AnalyticsRange } from "@/lib/types";

const RANGES: AnalyticsRange[] = [7, 28, 90, 365];

export const GET = route(async (req) => {
  const value = Number(new URL(req.url).searchParams.get("range"));
  const range = (RANGES as number[]).includes(value) ? (value as AnalyticsRange) : 28;
  return json(getAnalyticsSummary(range));
});
