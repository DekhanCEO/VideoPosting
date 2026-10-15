import { fail, json, readJson, route } from "@/lib/server/api";
import { deleteWebhook, updateWebhook, webhookInputSchema } from "@/lib/server/discord";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const input = webhookInputSchema.parse(await readJson(req));
  try {
    return json(updateWebhook(id, input));
  } catch (err) {
    return fail((err as Error).message, 422);
  }
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  deleteWebhook(id);
  return json({ ok: true });
});
