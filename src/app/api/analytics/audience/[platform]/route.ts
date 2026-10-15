import { fail, json, readJson, route } from "@/lib/server/api";
import { clearAudience, saveManualAudience } from "@/lib/server/audience";
import { isPlatformId } from "@/lib/types";

type Ctx = { params: Promise<{ platform: string }> };

/** Saisie manuelle de l'audience d'une plateforme (genre, âge, pays en pourcentages). */
export const PUT = route<Ctx>(async (req, { params }) => {
  const { platform } = await params;
  if (!isPlatformId(platform)) return fail("Plateforme inconnue.", 404);
  try {
    return json(saveManualAudience(platform, await readJson(req)));
  } catch (err) {
    return fail((err as Error).message, 422);
  }
});

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { platform } = await params;
  if (!isPlatformId(platform)) return fail("Plateforme inconnue.", 404);
  clearAudience(platform);
  return json({ ok: true });
});
