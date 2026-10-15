import { json, readJson, route } from "@/lib/server/api";
import { createRevenue, getRevenueSummary, revenueInputSchema } from "@/lib/server/revenue";

const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export const GET = route(async (req) => {
  const p = new URL(req.url).searchParams;
  return json(getRevenueSummary({ from: day(p.get("from")), to: day(p.get("to")) }));
});

export const POST = route(async (req) => json(createRevenue(revenueInputSchema.parse(await readJson(req))), 201));
