"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { firstError, formObject, type FormState } from "@/lib/admin/form";
import { financeSettingsSchema, saveSettingsSection, type FinanceSettings } from "@/lib/finance/settings";

const num = (v: string | undefined) => Number((v ?? "0").replace(",", ".")) || 0;

/** Valida e salva uma seção; cada tela do Comercial edita a sua. */
async function save<K extends keyof FinanceSettings>(section: K, raw: unknown, summary: string): Promise<FormState> {
  const user = await requireUser();
  const parsed = financeSettingsSchema.shape[section].safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error) };
  await saveSettingsSection(section, parsed.data as FinanceSettings[K]);
  await logActivity(user, "editou", "comercial", summary, null);
  revalidatePath("/admin", "layout");
  return { success: "Configurações salvas." };
}

export async function saveCompanyProfile(_: FormState, formData: FormData): Promise<FormState> {
  const f = formObject(formData);
  const keys = Object.keys(financeSettingsSchema.shape.company.shape);
  const company = Object.fromEntries(keys.map((k) => [k, f[k] ?? ""]));
  if (!company.legalName) return { error: "Informe a razão social." };
  return save("company", company, "Atualizou o perfil da empresa");
}

/** Configuração CT: modelo de contrato e padrões do orçamento, validados juntos antes de salvar. */
export async function saveContractTemplate(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const f = formObject(formData);
  const contract = financeSettingsSchema.shape.contract.safeParse({
    preamble: f.preamble ?? "",
    clauses: f.clauses ?? "",
    jurisdiction: f.jurisdiction ?? "",
    deliveryDays: Math.round(num(f.deliveryDays)),
  });
  if (!contract.success) return { error: firstError(contract.error) };
  if (contract.data.clauses.length < 10) return { error: "As cláusulas não podem ficar vazias." };
  const quote = financeSettingsSchema.shape.quote.safeParse({
    validityDays: Math.round(num(f.validityDays)) || 15,
    intro: f.quoteIntro ?? "",
    paymentTerms: f.paymentTerms ?? "",
    notes: f.quoteNotes ?? "",
  });
  if (!quote.success) return { error: firstError(quote.error) };
  await saveSettingsSection("contract", contract.data);
  await saveSettingsSection("quote", quote.data);
  await logActivity(user, "editou", "comercial", "Atualizou o modelo de contrato e orçamento (Configuração CT)", null);
  revalidatePath("/admin", "layout");
  return { success: "Modelo salvo." };
}

export async function saveBillingSettings(_: FormState, formData: FormData): Promise<FormState> {
  const f = formObject(formData);
  return save(
    "billing",
    { method: f.billingMethod, finePercent: num(f.finePercent), interestPercent: num(f.interestPercent), createOnSign: f.createOnSign === "on" },
    "Atualizou as configurações de cobrança",
  );
}

export async function saveInvoiceSettings(_: FormState, formData: FormData): Promise<FormState> {
  const f = formObject(formData);
  return save(
    "invoice",
    {
      autoIssue: f.autoIssue === "on",
      municipalServiceCode: f.municipalServiceCode ?? "",
      municipalServiceName: f.municipalServiceName ?? "",
      description: f.invoiceDescription ?? "",
      issPercent: num(f.issPercent),
      retainIss: f.retainIss === "on",
    },
    "Atualizou as configurações de nota fiscal",
  );
}
