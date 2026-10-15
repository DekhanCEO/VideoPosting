import { fail, json, readJson, route } from "@/lib/server/api";
import { deletePost, postInputSchema, updatePost } from "@/lib/server/posts";
import { cancelPublication } from "@/lib/server/publisher";
import { savePost } from "@/lib/server/save-post";
import { getPost } from "@/lib/server/store";
import { withMedia } from "@/lib/server/views";
import type { SaveAction } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  const post = getPost(id);
  return post ? json(withMedia(post)) : fail("Publication introuvable.", 404);
});

export const PUT = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  if (!getPost(id)) return fail("Publication introuvable.", 404);
  const body = await readJson<{ input: unknown; action?: SaveAction }>(req);
  const input = postInputSchema.parse(body.input);
  return savePost({ input, action: body.action ?? "draft", create: (status) => updatePost(id, input, status) });
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { id } = await params;
  cancelPublication(id);
  deletePost(id);
  return json({ ok: true });
});
