import { route } from "@/lib/server/api";
import { getRevenueSummary, revenueCsv } from "@/lib/server/revenue";

const day = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);

export const GET = route(async (req) => {
  const p = new URL(req.url).searchParams;
  const summary = getRevenueSummary({ from: day(p.get("from")), to: day(p.get("to")) });
  return new Response(revenueCsv(summary.entries), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="revenus_${summary.from}_${summary.to}.csv"`,
    },
  });
});
