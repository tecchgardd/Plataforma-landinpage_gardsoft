import { contractPdf } from "@/lib/finance/contract-pdf";

/** PDF do contrato pelo link secreto (o cliente lê antes de assinar e baixa a via assinada). */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const pdf = await contractPdf({ token });
  if (!pdf || pdf.contract.status === "rascunho" || pdf.contract.status === "cancelado") {
    return new Response("Not found", { status: 404 });
  }
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
