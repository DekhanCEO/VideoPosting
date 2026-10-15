import { getUsableAccount } from "@/lib/server/accounts";
import { fail, json, route } from "@/lib/server/api";
import { DEMO_TIKTOK_CREATOR } from "@/lib/server/platforms/demo";
import { fetchCreatorInfo } from "@/lib/server/platforms/tiktok";
import { getAccount } from "@/lib/server/store";

/** Infos du créateur TikTok (niveaux de confidentialité autorisés, durée max…), exigées par TikTok avant chaque publication. */
export const GET = route(async () => {
  const account = getAccount("tiktok");
  if (!account) return fail("Aucun compte TikTok connecté.", 404);
  if (account.demo) return json(DEMO_TIKTOK_CREATOR);
  try {
    return json(await fetchCreatorInfo(await getUsableAccount("tiktok")));
  } catch (err) {
    return fail((err as Error).message, 502);
  }
});
