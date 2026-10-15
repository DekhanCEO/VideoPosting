import { fail, json, readJson, route } from "@/lib/server/api";
import { startPublishing } from "@/lib/server/publisher";
import { getPost } from "@/lib/server/store";
import { withMedia } from "@/lib/server/views";
import { isPlatformId, type PlatformId } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** Lance (ou relance) la publication, éventuellement sur certaines plateformes seulement. */
export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  if (!getPost(id)) return fail("Publication introuvable.", 404);
  const body = await readJson<{ platforms?: string[] }>(req).catch(() => ({ platforms: undefined }));
  const platforms = body.platforms?.filter(isPlatformId) as PlatformId[] | undefined;
  startPublishing(id, platforms);
  return json(withMedia(getPost(id)!));
});
