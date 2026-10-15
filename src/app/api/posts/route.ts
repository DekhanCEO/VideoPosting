import { json, readJson, route } from "@/lib/server/api";
import { listPosts, newPost, postInputSchema } from "@/lib/server/posts";
import { savePost } from "@/lib/server/save-post";
import { withMedia } from "@/lib/server/views";
import type { SaveAction } from "@/lib/types";

export const GET = route(async () => json(listPosts().map(withMedia)));

export const POST = route(async (req) => {
  const body = await readJson<{ input: unknown; action?: SaveAction }>(req);
  const input = postInputSchema.parse(body.input);
  return savePost({ input, action: body.action ?? "draft", create: (status) => newPost(input, status) });
});
