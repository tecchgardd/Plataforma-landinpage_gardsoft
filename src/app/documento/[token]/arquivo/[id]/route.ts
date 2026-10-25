import { z } from "zod";
import { prisma } from "@/lib/prisma";

/** Anexo de um documento enviado, acessível só pelo link secreto do próprio documento. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token) || !z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const file = await prisma.documentFile.findFirst({
    where: { id, document: { token, status: { notIn: ["rascunho", "cancelado"] } } },
    select: { name: true, mime: true, data: true },
  });
  if (!file) return new Response("Not found", { status: 404 });
  const inline = file.mime === "application/pdf" || file.mime.startsWith("image/");
  const download = new URL(request.url).searchParams.has("baixar");
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${inline && !download ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
