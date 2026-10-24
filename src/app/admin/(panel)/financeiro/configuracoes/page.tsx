import { headers } from "next/headers";
import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import { Input, Select } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/session";
import { getFinanceSettings } from "@/lib/finance/settings";
import { asaasConfigured, asaasEnvironment } from "@/lib/integrations/asaas";
import { emailConfigured, emailProvider } from "@/lib/integrations/email";
import { siteUrl } from "@/lib/site-url";
import { saveBillingSettings } from "../../../_actions/settings";

export const metadata = { title: "Cobrança e integrações" };

export default async function BillingSettingsPage() {
  await requireUser();
  const { billing } = await getFinanceSettings();
  const h = await headers();
  const origin = process.env.BETTER_AUTH_URL ? siteUrl : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const pct = (n: number) => String(n).replace(".", ",");

  return (
    <>
      <PageHeader
        title="Cobrança e integrações"
        subtitle="Boleto e Pix pelo Asaas, multa e juros, e o envio de e-mails."
        back={{ href: "/admin/financeiro", label: "Financeiro" }}
      />

      <div className="adm-detail">
        <section className="adm-card">
          <ActionForm action={saveBillingSettings} submitLabel="Salvar configurações">
            <fieldset className="adm-fieldset">
              <legend>Cobrança (Asaas)</legend>
              <Select
                label="Forma de cobrança"
                name="billingMethod"
                options={[
                  { value: "UNDEFINED", label: "Cliente escolhe (boleto ou Pix)" },
                  { value: "BOLETO", label: "Somente boleto" },
                  { value: "PIX", label: "Somente Pix" },
                ]}
                defaultValue={billing.method}
              />
              <Input label="Multa por atraso (%)" name="finePercent" inputMode="decimal" defaultValue={pct(billing.finePercent)} hint="Máximo de 2% (CDC)." />
              <Input label="Juros ao mês (%)" name="interestPercent" inputMode="decimal" defaultValue={pct(billing.interestPercent)} />
              <label className="adm-check wide">
                <input type="checkbox" name="createOnSign" defaultChecked={billing.createOnSign} /> Gerar as cobranças automaticamente quando o cliente assinar o
                contrato
              </label>
            </fieldset>
          </ActionForm>
          <p className="adm-card-sub" style={{ marginTop: 16 }}>
            Dados da empresa ficam em <Link href="/admin/empresa">Perfil da empresa</Link>, o modelo de contrato em{" "}
            <Link href="/admin/contratos/configuracao">Configuração CT</Link> e a nota fiscal em{" "}
            <Link href="/admin/notas-fiscais/configuracoes">Notas fiscais → Configurações</Link>.
          </p>
        </section>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Asaas</h2>
            <p className={`adm-integration ${asaasConfigured() ? "ok" : ""}`}>
              {asaasConfigured() ? `Conectado · ${asaasEnvironment() === "production" ? "produção" : "sandbox (testes)"}` : "Não configurado"}
            </p>
            <ol className="adm-howto">
              <li>
                Crie a conta em <a href="https://www.asaas.com" target="_blank" rel="noopener noreferrer">asaas.com</a> (para testar, use o{" "}
                <a href="https://sandbox.asaas.com" target="_blank" rel="noopener noreferrer">sandbox</a>).
              </li>
              <li>Em Integrações → Chaves de API, gere a chave.</li>
              <li>
                No <code>.env.local</code> (e na Vercel): <code>ASAAS_API_KEY</code>, <code>ASAAS_ENV=sandbox</code> ou <code>production</code> e um{" "}
                <code>ASAAS_WEBHOOK_TOKEN</code> aleatório.
              </li>
              <li>
                Em Integrações → Webhooks, crie um webhook para cobranças e notas fiscais com a URL abaixo e o mesmo token:
                <code className="adm-code">{origin.replace(/\/$/, "")}/api/webhooks/asaas</code>
              </li>
            </ol>
          </section>
          <section className="adm-card">
            <h2>E-mail</h2>
            <p className={`adm-integration ${emailConfigured() ? "ok" : ""}`}>{emailConfigured() ? `Conectado · ${emailProvider()}` : "Não configurado"}</p>
            <p className="adm-card-sub">Pelo Gmail (mais simples):</p>
            <ol className="adm-howto">
              <li>
                Na conta Google, ative a verificação em duas etapas e crie uma{" "}
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">senha de app</a>.
              </li>
              <li>
                No <code>.env.local</code>: <code>SMTP_HOST=smtp.gmail.com</code>, <code>SMTP_PORT=465</code>, <code>SMTP_USER</code> (o e-mail) e{" "}
                <code>SMTP_PASS</code> (a senha de app, sem espaços).
              </li>
            </ol>
            <p className="adm-card-sub">Ou pelo Resend (com domínio próprio):</p>
            <ol className="adm-howto">
              <li>
                Crie a conta em <a href="https://resend.com" target="_blank" rel="noopener noreferrer">resend.com</a> e verifique o domínio da Gardsoft
                (registros DNS).
              </li>
              <li>Gere uma API key.</li>
              <li>
                No <code>.env.local</code>: <code>RESEND_API_KEY</code> e <code>MAIL_FROM=&quot;Gardsoft &lt;contato@seudominio.com.br&gt;&quot;</code>.
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
