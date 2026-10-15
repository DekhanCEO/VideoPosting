import { fileResponse } from "@/lib/server/media";
import { getMedia } from "@/lib/server/store";

type Ctx = { params: Promise<{ id: string }> };

async function serve(req: Request, { params }: Ctx) {
  const { id } = await params;
  const media = getMedia(id);
  if (!media) return new Response("Introuvable", { status: 404 });
  return fileResponse(media, req.headers.get("range"), req.method);
}

export const GET = serve;
export const HEAD = serve;
