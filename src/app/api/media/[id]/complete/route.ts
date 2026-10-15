import { z } from "zod";
import { json, readJson, route } from "@/lib/server/api";
import { completeMedia } from "@/lib/server/media";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({
  duration: z.number().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  posterId: z.string().uuid().optional(),
});

export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const meta = schema.parse(await readJson(req));
  return json(await completeMedia(id, meta));
});
