import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** Serve as imagens enviadas pelo portal. O conteúdo de um id nunca muda, então pode ser cacheado para sempre. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const file = await prisma.media.findUnique({ where: { id }, select: { mime: true, data: true } });
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
