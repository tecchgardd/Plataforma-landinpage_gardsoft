import "server-only";

/**
 * Integração com o Asaas (boleto, Pix, baixa automática e nota fiscal de serviço).
 * Variáveis: ASAAS_API_KEY, ASAAS_ENV ("sandbox" | "production"), ASAAS_WEBHOOK_TOKEN.
 * Documentação: https://docs.asaas.com
 */

export function asaasConfigured() {
  return Boolean(process.env.ASAAS_API_KEY);
}

export function asaasEnvironment() {
  return process.env.ASAAS_ENV === "production" ? "production" : "sandbox";
}

function baseUrl() {
  return asaasEnvironment() === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export class AsaasError extends Error {}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new AsaasError("Asaas não configurado: defina ASAAS_API_KEY.");
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", access_token: key, "User-Agent": "gardsoft-portal" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { errors?: { description: string }[] } & T;
  if (!res.ok) {
    const message = data.errors?.map((e) => e.description).join(" ") || `Erro ${res.status} no Asaas.`;
    throw new AsaasError(message);
  }
  return data;
}

export type AsaasCustomerInput = {
  name: string;
  cpfCnpj: string;
  email?: string | null;
  mobilePhone?: string | null;
  postalCode?: string | null;
  address?: string | null;
  externalReference?: string;
};

export async function createCustomer(input: AsaasCustomerInput) {
  const digits = (v?: string | null) => (v ? v.replace(/\D/g, "") : undefined);
  return request<{ id: string }>("/customers", {
    method: "POST",
    body: {
      name: input.name,
      cpfCnpj: digits(input.cpfCnpj),
      email: input.email || undefined,
      mobilePhone: digits(input.mobilePhone),
      postalCode: digits(input.postalCode),
      address: input.address || undefined,
      externalReference: input.externalReference,
    },
  });
}

export type AsaasPayment = {
  id: string;
  status: string;
  invoiceUrl: string;
  bankSlipUrl?: string | null;
  value: number;
  dueDate: string;
};

export async function createPayment(input: {
  customer: string;
  billingType: "UNDEFINED" | "BOLETO" | "PIX";
  valueCents: number;
  dueDate: string;
  description: string;
  externalReference: string;
  finePercent: number;
  interestPercent: number;
}) {
  return request<AsaasPayment>("/payments", {
    method: "POST",
    body: {
      customer: input.customer,
      billingType: input.billingType,
      value: input.valueCents / 100,
      dueDate: input.dueDate,
      description: input.description.slice(0, 500),
      externalReference: input.externalReference,
      fine: input.finePercent ? { value: input.finePercent } : undefined,
      interest: input.interestPercent ? { value: input.interestPercent } : undefined,
    },
  });
}

export async function getPayment(id: string) {
  return request<AsaasPayment>(`/payments/${id}`);
}

export async function deletePayment(id: string) {
  return request<{ deleted: boolean }>(`/payments/${id}`, { method: "DELETE" });
}

export type AsaasInvoice = {
  id: string;
  status: string;
  number?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  statusDescription?: string | null;
};

/** Agenda a NFS-e vinculada à cobrança. Ela é emitida pela prefeitura na data efetiva (INVOICE_AUTHORIZED). */
export async function scheduleInvoice(input: {
  payment: string;
  valueCents: number;
  serviceDescription: string;
  observations: string;
  municipalServiceCode: string;
  municipalServiceName: string;
  issPercent: number;
  retainIss: boolean;
  externalReference: string;
}) {
  return request<AsaasInvoice>("/invoices", {
    method: "POST",
    body: {
      payment: input.payment,
      serviceDescription: input.serviceDescription,
      observations: input.observations,
      value: input.valueCents / 100,
      deductions: 0,
      effectiveDate: new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10),
      municipalServiceCode: input.municipalServiceCode || undefined,
      municipalServiceName: input.municipalServiceName,
      externalReference: input.externalReference,
      taxes: { retainIss: input.retainIss, iss: input.issPercent, pis: 0, cofins: 0, csll: 0, inss: 0, ir: 0 },
    },
  });
}

export async function getInvoice(id: string) {
  return request<AsaasInvoice>(`/invoices/${id}`);
}

/** Status do Asaas que significam "pago". */
export const PAID_STATUSES = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];
