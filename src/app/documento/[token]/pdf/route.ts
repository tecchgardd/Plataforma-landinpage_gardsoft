import { prisma } from "@/lib/prisma";
import { documentPdf } from "@/lib/documents-server";

/** PDF do documento pelo link secreto (o cliente lê, aprova e baixa). */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const doc = await prisma.projectDocument.findUnique({ where: { token }, select: { status: true } });
  if (!doc || doc.status === "rascunho" || doc.status === "cancelado") return new Response("Not found", { status: 404 });
  const pdf = await documentPdf({ token });
  if (!pdf) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.has("baixar");
  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
