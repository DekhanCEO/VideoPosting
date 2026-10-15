import { json, readJson, route } from "@/lib/server/api";
import { deleteRevenue, revenueInputSchema, updateRevenue } from "@/lib/server/revenue";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  return json(updateRevenue(id, revenueInputSchema.parse(await readJson(req))));
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  deleteRevenue(id);
  return json({ ok: true });
});
