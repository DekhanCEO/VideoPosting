import { json, route } from "@/lib/server/api";
import { legalInfo } from "@/lib/legal";
import { getSettings } from "@/lib/server/store";

/** Éditeur et contact affichés sur les pages légales publiques (accessible sans connexion). */
export const GET = route(async () => json(legalInfo(getSettings().legal)));
