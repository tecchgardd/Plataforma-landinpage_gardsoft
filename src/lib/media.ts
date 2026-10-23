import { signMediaUpload, uploadImage } from "@/app/admin/_actions/media";

export type MediaKind = "image" | "video";

/** Tipos aceitos e tamanho máximo (limites do plano gratuito do Cloudinary). */
export const mediaRules: Record<MediaKind, { accept: string; maxBytes: number; label: string }> = {
  image: { accept: "image/jpeg,image/png,image/webp,image/gif,image/avif", maxBytes: 10 * 1024 * 1024, label: "JPG, PNG, WEBP ou GIF, até 10 MB" },
  video: { accept: "video/mp4,video/webm,video/quicktime", maxBytes: 100 * 1024 * 1024, label: "MP4, WEBM ou MOV, até 100 MB" },
};

type Result = { url?: string; error?: string };

/**
 * Envia uma foto ou vídeo do portal. Com o Cloudinary configurado, o arquivo vai direto do navegador
 * para lá (com progresso); sem ele, imagens ficam no banco e vídeos não são aceitos.
 */
export async function uploadMedia(file: File, kind: MediaKind, onProgress?: (percent: number) => void): Promise<Result> {
  const rules = mediaRules[kind];
  if (!file.type.startsWith(`${kind}/`)) return { error: `Formato não suportado. Use ${rules.label}.` };
  if (file.size > rules.maxBytes) return { error: `O arquivo deve ter ${rules.label.split(", ").pop()}.` };

  const signed = await signMediaUpload(kind);
  if (!signed) {
    if (kind === "video") return { error: "Para enviar vídeos, configure o Cloudinary no .env (CLOUDINARY_*)." };
    const data = new FormData();
    data.set("file", file);
    return uploadImage(data);
  }

  const data = new FormData();
  for (const [key, value] of Object.entries(signed.fields)) data.set(key, value);
  data.set("file", file);
  return new Promise<Result>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { secure_url?: string; error?: { message?: string } } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status < 300 && body.secure_url) resolve({ url: body.secure_url });
      else resolve({ error: body.error?.message ? `Cloudinary: ${body.error.message}` : `Falha no envio (erro ${xhr.status}).` });
    };
    xhr.onerror = () => resolve({ error: "Falha de conexão ao enviar o arquivo." });
    xhr.send(data);
  });
}

/**
 * Para arquivos do Cloudinary, pede formato e qualidade automáticos (WEBP/AVIF, vídeo comprimido)
 * e, se informada, uma largura máxima. Outras URLs passam intactas.
 */
export function mediaUrl(url: string, opts: { width?: number } = {}) {
  const marker = "/upload/";
  if (!url.startsWith("https://res.cloudinary.com/") || !url.includes(marker)) return url;
  const transform = ["f_auto", "q_auto", opts.width && `c_limit,w_${opts.width}`].filter(Boolean).join(",");
  return url.replace(marker, `${marker}${transform}/`);
}
