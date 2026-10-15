import { fail, json, route } from "@/lib/server/api";
import { MAX_CHUNK_SIZE, writeChunk } from "@/lib/server/media";

type Ctx = { params: Promise<{ id: string }> };

/** Reçoit un morceau du fichier à la position `offset` (POST pour passer partout, y compris derrière un pare-feu). */
export const POST = route<Ctx>(async (req, { params }) => {
  const { id } = await params;
  const offset = Number(new URL(req.url).searchParams.get("offset") ?? "0");
  if (!Number.isInteger(offset) || offset < 0) return fail("Position invalide.");
  const data = Buffer.from(await req.arrayBuffer());
  if (data.length === 0) return fail("Morceau vide.");
  if (data.length > MAX_CHUNK_SIZE) return fail("Morceau trop volumineux.", 413);
  try {
    const media = await writeChunk(id, offset, data);
    return json({ uploadedBytes: media.uploadedBytes });
  } catch (err) {
    const e = err as Error & { expected?: number };
    if (e.message === "offset_mismatch") return fail("Position inattendue.", 409, { expected: e.expected });
    throw err;
  }
});
