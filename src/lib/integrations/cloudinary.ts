import "server-only";
import { createHash } from "node:crypto";

/**
 * Integração com o Cloudinary (fotos e vídeos do site).
 * Variáveis: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET e, opcional, CLOUDINARY_FOLDER.
 * O navegador envia o arquivo direto para o Cloudinary com uma assinatura gerada aqui,
 * então vídeos grandes não passam pelo servidor do site.
 * Documentação: https://cloudinary.com/documentation/upload_images#authenticated_requests
 */

export type MediaKind = "image" | "video";

const formats: Record<MediaKind, string> = {
  image: "jpg,jpeg,png,webp,gif,avif",
  video: "mp4,webm,mov",
};

export function cloudinaryConfigured() {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

export type SignedUpload = { url: string; fields: Record<string, string> };

/** Gera os campos assinados de um envio. A assinatura vale por 1 hora e só aceita os formatos do tipo pedido. */
export function signUpload(kind: MediaKind): SignedUpload {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME!;
  const params: Record<string, string> = {
    allowed_formats: formats[kind],
    folder: process.env.CLOUDINARY_FOLDER || "gardsoft",
    timestamp: String(Math.round(Date.now() / 1000)),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  const signature = createHash("sha1")
    .update(toSign + process.env.CLOUDINARY_API_SECRET)
    .digest("hex");
  return {
    url: `https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`,
    fields: { ...params, api_key: process.env.CLOUDINARY_API_KEY!, signature },
  };
}
