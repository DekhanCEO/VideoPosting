import { fileResponse, verifySignature } from "@/lib/server/media";
import { getMedia } from "@/lib/server/store";

type Ctx = { params: Promise<{ id: string }> };

/** URL temporaire et signée, utilisée par Instagram pour télécharger la vidéo. */
async function serve(req: Request, { params }: Ctx) {
  const { id } = await params;
  const url = new URL(req.url);
  if (!verifySignature(id, url.searchParams.get("exp"), url.searchParams.get("sig"))) {
    return new Response("Lien expiré ou invalide", { status: 403 });
  }
  const media = getMedia(id);
  if (!media || media.status !== "ready") return new Response("Introuvable", { status: 404 });
  return fileResponse(media, req.headers.get("range"), req.method);
}

export const GET = serve;
export const HEAD = serve;
