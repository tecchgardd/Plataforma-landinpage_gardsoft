"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const MAX_BYTES = 5 * 1024 * 1024;

/** Confere a assinatura do arquivo, não só a extensão informada pelo navegador. */
function detectImage(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP")
    return "image/webp";
  if (bytes.subarray(0, 4).toString("ascii") === "GIF8") return "image/gif";
  return null;
}

export async function uploadImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione uma imagem." };
  if (file.size > MAX_BYTES) return { error: "A imagem deve ter no máximo 5 MB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectImage(bytes);
  if (!mime) return { error: "Formato não suportado. Use JPG, PNG, WEBP ou GIF." };

  const row = await prisma.media.create({
    data: { filename: file.name.slice(0, 120), mime, size: bytes.length, data: new Uint8Array(bytes) },
    select: { id: true },
  });
  return { url: `/api/media/${row.id}` };
}
