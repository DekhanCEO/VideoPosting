import { fail, json, route } from "@/lib/server/api";
import { getSettings, removeAccount } from "@/lib/server/store";
import { isPlatformId } from "@/lib/types";

type Ctx = { params: Promise<{ platform: string }> };

export const DELETE = route<Ctx>(async (_req, { params }) => {
  const { platform } = await params;
  if (!isPlatformId(platform)) return fail("Plateforme inconnue.", 404);
  removeAccount(platform, getSettings().demoMode);
  return json({ ok: true });
});
