import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { FinanceSettings } from "./settings";

export const installmentSchema = z.object({
  label: z.string().trim().min(1).max(60),
  amountCents: z.number().int().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export const paymentPlanSchema = z.array(installmentSchema).min(1).max(36);
export type Installment = z.infer<typeof installmentSchema>;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (cents: number) => brl.format(cents / 100);

/** Token secreto do link público de assinatura. */
export function newToken() {
  return randomBytes(24).toString("base64url");
}

/** Próximo número sequencial do ano: GS-2026-0001. */
export async function nextContractNumber() {
  const year = new Date().getFullYear();
  const last = await prisma.contract.findFirst({
    where: { number: { startsWith: `GS-${year}-` } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = last ? Number(last.number.split("-")[2]) + 1 : 1;
  return `GS-${year}-${String(seq).padStart(4, "0")}`;
}

export type ContractData = {
  number: string;
  title: string;
  scope: string;
  clauses: string;
  valueCents: number;
  paymentPlan: Installment[];
  deliveryDays: number | null;
  client: {
    name: string;
    company: string | null;
    document: string | null;
    stateRegistration: string | null;
    address: string | null;
    zipCode: string | null;
    city: string | null;
    state: string | null;
    email: string | null;
    phone: string | null;
  };
};

export function partyName(client: ContractData["client"]) {
  return client.company ?? client.name;
}

/** Substitui as variáveis das cláusulas. */
export function renderClauses(data: ContractData, settings: FinanceSettings) {
  const prazo = data.deliveryDays ? `${data.deliveryDays} dias` : "a combinar entre as partes";
  return data.clauses
    .replaceAll("{contratante}", partyName(data.client))
    .replaceAll("{contratada}", settings.company.legalName || "Gardsoft")
    .replaceAll("{valor}", money(data.valueCents))
    .replaceAll("{prazo}", prazo)
    .replaceAll("{foro}", settings.contract.jurisdiction || settings.company.cityState || "domicílio da CONTRATADA");
}

/** Texto canônico do contrato: é o que o hash (código de verificação) protege. */
export function canonicalText(data: ContractData, settings: FinanceSettings) {
  return JSON.stringify({
    number: data.number,
    title: data.title,
    contratada: settings.company,
    contratante: data.client,
    scope: data.scope,
    valueCents: data.valueCents,
    paymentPlan: data.paymentPlan,
    deliveryDays: data.deliveryDays,
    clauses: renderClauses(data, settings),
  });
}

export function contentHash(data: ContractData, settings: FinanceSettings) {
  return createHash("sha256").update(canonicalText(data, settings)).digest("hex");
}

/** Código curto exibido no PDF (os 16 primeiros caracteres do hash). */
export const verificationCode = (hash: string) => hash.slice(0, 16).toUpperCase().replace(/(.{4})(?!$)/g, "$1-");

export function publicBaseUrl() {
  return (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function signUrl(token: string) {
  return `${publicBaseUrl()}/contrato/${token}`;
}

/** Carrega o contrato com o cliente, no formato usado pelo PDF e pela página pública. */
export async function loadContract(where: { id: string } | { token: string }) {
  const contract = await prisma.contract.findUnique({
    where,
    include: {
      client: true,
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!contract) return null;
  const plan = paymentPlanSchema.safeParse(contract.paymentPlan);
  const data: ContractData = {
    number: contract.number,
    title: contract.title,
    scope: contract.scope,
    clauses: contract.clauses,
    valueCents: contract.valueCents,
    paymentPlan: plan.success ? plan.data : [],
    deliveryDays: contract.deliveryDays,
    client: contract.client,
  };
  return { contract, data };
}
