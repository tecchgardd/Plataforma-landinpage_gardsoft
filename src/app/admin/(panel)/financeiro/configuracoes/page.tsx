import { headers } from "next/headers";
import ActionForm from "@/components/admin/ActionForm";
import { Input, Select, TextArea } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/session";
import { getFinanceSettings } from "@/lib/finance/settings";
import { asaasConfigured, asaasEnvironment } from "@/lib/integrations/asaas";
import { emailConfigured } from "@/lib/integrations/email";
import { saveSettings } from "../../../_actions/finance";

export const metadata = { title: "Configurações financeiras" };

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="adm-check wide">
      <input type="checkbox" name={name} defaultChecked={checked} /> {label}
    </label>
  );
}

export default async function FinanceSettingsPage() {
  await requireUser();
  const settings = await getFinanceSettings();
  const h = await headers();
  const origin = process.env.BETTER_AUTH_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const pct = (n: number) => String(n).replace(".", ",");

  return (
    <>
      <PageHeader title="Configurações financeiras" subtitle="Dados da empresa nos contratos, cobranças, nota fiscal e integrações." back={{ href: "/admin/financeiro", label: "Financeiro" }} />

      <div className="adm-detail">
        <section className="adm-card">
          <ActionForm action={saveSettings} submitLabel="Salvar configurações">
            <fieldset className="adm-fieldset">
              <legend>Empresa (contratada)</legend>
              <Input label="Razão social" name="legalName" defaultValue={settings.company.legalName} required />
              <Input label="Nome fantasia" name="tradeName" defaultValue={settings.company.tradeName} />
              <Input label="CNPJ" name="document" defaultValue={settings.company.document} />
              <Input label="Representante (assina pela empresa)" name="representative" defaultValue={settings.company.representative} />
              <Input label="Endereço" name="address" defaultValue={settings.company.address} wide />
              <Input label="Cidade/UF" name="cityState" defaultValue={settings.company.cityState} placeholder="Porto Alegre/RS" />
              <Input label="E-mail (recebe cópia dos contratos assinados)" name="email" type="email" defaultValue={settings.company.email} />
              <Input label="Telefone" name="phone" defaultValue={settings.company.phone} />
              <Input label="Site" name="website" defaultValue={settings.company.website} />
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>Contrato</legend>
              <Input label="Foro (comarca)" name="jurisdiction" defaultValue={settings.contract.jurisdiction} placeholder="Porto Alegre/RS" />
              <TextArea
                label="Cláusulas padrão"
                name="clauses"
                defaultValue={settings.contract.clauses}
                wide
                rows={18}
                hint="Usadas em todo contrato novo. Variáveis: {contratante}, {contratada}, {valor}, {prazo}, {foro}. Peça para um advogado revisar."
              />
            </fieldset>
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
                defaultValue={settings.billing.method}
              />
              <Input label="Multa por atraso (%)" name="finePercent" inputMode="decimal" defaultValue={pct(settings.billing.finePercent)} hint="Máximo de 2% (CDC)." />
              <Input label="Juros ao mês (%)" name="interestPercent" inputMode="decimal" defaultValue={pct(settings.billing.interestPercent)} />
              <Check name="createOnSign" label="Gerar as cobranças automaticamente quando o cliente assinar o contrato" checked={settings.billing.createOnSign} />
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>Nota fiscal (NFS-e pelo Asaas)</legend>
              <Check name="autoIssue" label="Emitir a nota automaticamente quando o pagamento for confirmado" checked={settings.invoice.autoIssue} />
              <Input label="Código do serviço municipal" name="municipalServiceCode" defaultValue={settings.invoice.municipalServiceCode} placeholder="Ex.: 01.07" />
              <Input label="Alíquota de ISS (%)" name="issPercent" inputMode="decimal" defaultValue={pct(settings.invoice.issPercent)} />
              <Input label="Nome do serviço municipal" name="municipalServiceName" defaultValue={settings.invoice.municipalServiceName} wide />
              <Input
                label="Descrição na nota"
                name="invoiceDescription"
                defaultValue={settings.invoice.description}
                wide
                hint="{descricao} vira a descrição do lançamento. Confirme o código e a alíquota com seu contador."
              />
              <Check name="retainIss" label="ISS retido pelo tomador" checked={settings.invoice.retainIss} />
            </fieldset>
          </ActionForm>
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
              <li>Para nota fiscal, configure os dados da prefeitura em Notas Fiscais no Asaas.</li>
            </ol>
          </section>
          <section className="adm-card">
            <h2>E-mail (Resend)</h2>
            <p className={`adm-integration ${emailConfigured() ? "ok" : ""}`}>{emailConfigured() ? "Conectado" : "Não configurado"}</p>
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
