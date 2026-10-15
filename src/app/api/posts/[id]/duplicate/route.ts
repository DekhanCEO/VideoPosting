import { json, route } from "@/lib/server/api";
import { duplicatePost } from "@/lib/server/posts";
import { withMedia } from "@/lib/server/views";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  return json(withMedia(duplicatePost(id)));
});
