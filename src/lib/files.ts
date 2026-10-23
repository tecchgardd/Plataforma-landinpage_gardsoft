import "server-only";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const extMime: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  zip: "application/zip",
  fig: "application/octet-stream",
};

/**
 * Identifica o tipo pelo conteúdo do arquivo (não confia na extensão enviada pelo navegador).
 * Aceita PDF, imagens, XML (ex.: nota fiscal), texto/CSV e documentos Office/ZIP.
 */
export function detectFile(bytes: Buffer, filename: string): string | null {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  const head = (n: number) => bytes.subarray(0, n).toString("latin1");
  if (head(5) === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (head(8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (head(4) === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (head(4) === "GIF8") return "image/gif";
  if (head(4) === "PK\x03\x04") return extMime[ext] ?? "application/zip";

  // Arquivos de texto: sem bytes nulos no início.
  const sample = bytes.subarray(0, 2048);
  if (sample.includes(0)) return null;
  const text = sample.toString("utf8").trimStart();
  if (ext === "xml" || text.startsWith("<?xml")) return "application/xml";
  if (ext === "csv") return "text/csv";
  if (ext === "txt" || ext === "md") return "text/plain";
  return null;
}

/** Lê e valida o arquivo de um FormData. */
export async function readUpload(formData: FormData, field = "file") {
  const file = formData.get(field);
  if (!(file instanceof File) || file.size === 0) return { error: "Selecione um arquivo." } as const;
  if (file.size > MAX_FILE_BYTES) return { error: "O arquivo deve ter no máximo 10 MB." } as const;
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = detectFile(bytes, file.name);
  if (!mime) return { error: "Formato não suportado. Envie PDF, imagem, XML, CSV, TXT, DOCX, XLSX ou ZIP." } as const;
  return { name: file.name.slice(0, 160), mime, size: bytes.length, data: new Uint8Array(bytes) } as const;
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
