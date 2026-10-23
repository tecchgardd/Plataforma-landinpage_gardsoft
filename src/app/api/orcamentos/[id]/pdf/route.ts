import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { quotePdf } from "@/lib/finance/quote-pdf";

/** PDF do orçamento para a equipe (qualquer situação). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const pdf = await quotePdf({ id });
  if (!pdf) return new Response("Not found", { status: 404 });
  const download = new URL(request.url).searchParams.has("baixar");
  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
