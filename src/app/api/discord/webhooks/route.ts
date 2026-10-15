import { fail, json, readJson, route } from "@/lib/server/api";
import { createWebhook, listWebhooks, webhookInputSchema } from "@/lib/server/discord";

export const GET = route(async () => json(listWebhooks()));

export const POST = route(async (req) => {
  const input = webhookInputSchema.parse(await readJson(req));
  try {
    return json(createWebhook(input), 201);
  } catch (err) {
    return fail((err as Error).message, 422);
  }
});
