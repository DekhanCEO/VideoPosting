import { fail, json, route } from "@/lib/server/api";
import { testWebhook } from "@/lib/server/discord";

type Ctx = { params: Promise<{ id: string }> };

/** Envoie un message de test dans le salon Discord. */
export const POST = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  try {
    await testWebhook(id);
    return json({ ok: true });
  } catch (err) {
    return fail((err as Error).message, 502);
  }
});
