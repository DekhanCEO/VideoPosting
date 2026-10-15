import { json, readJson, route } from "@/lib/server/api";
import { applySettingsPatch, clearCredentials, settingsPatchSchema, toPublicSettings } from "@/lib/server/settings";
import { isPlatformId } from "@/lib/types";

export const GET = route(async (req) => json(toPublicSettings(req)));

export const PUT = route(async (req) => {
  const body = await readJson<Record<string, unknown> & { clearCredentials?: string }>(req);
  if (isPlatformId(body.clearCredentials)) clearCredentials(body.clearCredentials);
  applySettingsPatch(settingsPatchSchema.parse(body));
  return json(toPublicSettings(req));
});
