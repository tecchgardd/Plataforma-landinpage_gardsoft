import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Download dos documentos de clientes, projetos, lançamentos e notas fiscais.
 * Diferente das imagens do site, exige sessão: são documentos internos.
 */
export async function GET(request: Request, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { tipo, id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const select = { name: true, mime: true, data: true } as const;
  const file =
    tipo === "cliente"
      ? await prisma.clientFile.findUnique({ where: { id }, select })
      : tipo === "projeto"
        ? await prisma.projectFile.findUnique({ where: { id }, select })
        : tipo === "financeiro"
          ? await prisma.financeFile.findUnique({ where: { id }, select })
          : tipo === "notafiscal"
            ? await prisma.invoiceFile.findUnique({ where: { id }, select })
            : null;
  if (!file) return new Response("Not found", { status: 404 });

  // PDF e imagens abrem no navegador; o resto baixa.
  const inline = file.mime === "application/pdf" || file.mime.startsWith("image/");
  const download = new URL(request.url).searchParams.has("baixar");
  const disposition = `${inline && !download ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`;
  return new Response(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
