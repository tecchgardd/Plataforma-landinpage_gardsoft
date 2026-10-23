import { z } from "zod";

export type FormState = { error?: string; success?: string };

/** Lê um FormData como objeto simples de strings (campos ausentes viram ""). */
export function formObject(formData: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) if (typeof value === "string") out[key] = value.trim();
  return out;
}

export function firstError(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

export const optionalDate = z
  .string()
  .trim()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida.")
  .transform((v) => v || null);

export const optionalUuid = z
  .string()
  .trim()
  .refine((v) => !v || z.uuid().safeParse(v).success, "Seleção inválida.")
  .transform((v) => v || null);
