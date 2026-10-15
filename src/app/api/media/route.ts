import { z } from "zod";
import { json, readJson, route } from "@/lib/server/api";
import { createMedia } from "@/lib/server/media";

const schema = z.object({
  fileName: z.string().min(1).max(300),
  size: z.number().int().positive(),
  mimeType: z.string().min(3).max(100),
});

/** Ouvre un envoi : le fichier est ensuite transmis par morceaux (PUT /api/media/:id). */
export const POST = route(async (req) => {
  const input = schema.parse(await readJson(req));
  return json(createMedia(input), 201);
});
