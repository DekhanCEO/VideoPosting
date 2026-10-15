import "server-only";
import type { Post, PostInput, PostStatus, SaveAction } from "../types";
import { validatePost } from "../validation";
import { listPublicAccounts } from "./accounts";
import { fail, json } from "./api";
import { startPublishing } from "./publisher";
import { getMedia } from "./store";
import { withMedia } from "./views";

/**
 * Logique commune à la création et à la modification :
 *  - brouillon : enregistré tel quel ;
 *  - programmation / publication : validation complète avant enregistrement.
 */
export function savePost(args: { input: PostInput; action: SaveAction; create: (status: PostStatus) => Post }) {
  const { input, action } = args;
  if (action === "schedule" && !input.scheduledAt) return fail("Choisissez une date de programmation.", 422);

  if (action !== "draft") {
    const media = input.mediaId ? getMedia(input.mediaId) : undefined;
    if (input.mediaId && !media) return fail("La vidéo est introuvable, ajoutez-la à nouveau.", 422);
    const connected = Object.fromEntries(listPublicAccounts().map((a) => [a.platform, !a.needsReconnect]));
    const issues = validatePost({
      input: action === "publish" ? { ...input, scheduledAt: null } : input,
      media,
      connected,
      mode: "publish",
    });
    const errors = issues.filter((i) => i.level === "error");
    if (errors.length) return fail(errors[0].message, 422, { issues: errors });
  }

  const status: PostStatus = action === "draft" ? "draft" : action === "schedule" ? "scheduled" : "publishing";
  const post = args.create(status);
  if (action === "publish") startPublishing(post.id);
  return json(withMedia(post), 200);
}
