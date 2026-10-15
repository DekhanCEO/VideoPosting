import { fail, json, readJson, route } from "@/lib/server/api";
import { cancelPublication } from "@/lib/server/publisher";
import { db, getPost } from "@/lib/server/store";
import { withMedia } from "@/lib/server/views";
import { isPlatformId } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Annule un envoi en cours, ou déprogramme une publication (qui redevient un brouillon). */
export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const post = getPost(id);
  if (!post) return fail("Publication introuvable.", 404);
  const body = await readJson<{ platform?: string }>(req).catch(() => ({ platform: undefined }));
  const platform = isPlatformId(body.platform) ? body.platform : undefined;

  if (post.status === "scheduled") {
    db().update((d) => {
      const p = d.posts.find((x) => x.id === id);
      if (p) {
        p.status = "draft";
        p.updatedAt = Date.now();
      }
    });
  } else if (!cancelPublication(id, platform)) {
    return fail("Rien à annuler pour cette publication.", 409);
  }
  return json(withMedia(getPost(id)!));
});
