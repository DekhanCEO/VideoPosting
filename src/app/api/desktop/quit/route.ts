import { fail, json, route } from "@/lib/server/api";
import { db } from "@/lib/server/store";

/** Versions Windows / macOS : bouton « Quitter » (il n'y a pas de fenêtre d'application à fermer). */
export const POST = route(async () => {
  if (process.env.VP_DESKTOP !== "1") return fail("Disponible uniquement dans la version ordinateur.", 404);
  db().flush();
  setTimeout(() => process.exit(0), 300);
  return json({ ok: true });
});
