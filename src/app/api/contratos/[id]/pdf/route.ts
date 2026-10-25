import { z } from "zod";
import { getAccess } from "@/lib/access";
import { contractPdf } from "@/lib/finance/contract-pdf";

/** PDF do contrato para a equipe (minuta ou assinado). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAccess();
  if (!access) return new Response("Unauthorized", { status: 401 });
  if (access.level("contratos") < 1) return new Response("Forbidden", { status: 403 });
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new Response("Not found", { status: 404 });
  const pdf = await contractPdf({ id });
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
