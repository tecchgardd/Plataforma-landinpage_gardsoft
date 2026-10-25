import ActionForm from "@/components/admin/ActionForm";
import { Input } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { requireAccess } from "@/lib/access";
import { getFinanceSettings } from "@/lib/finance/settings";
import { asaasConfigured, asaasEnvironment } from "@/lib/integrations/asaas";
import { saveInvoiceSettings } from "../../../_actions/settings";

export const metadata = { title: "Configurações de nota fiscal" };

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="adm-check wide">
      <input type="checkbox" name={name} defaultChecked={checked} /> {label}
    </label>
  );
}

export default async function InvoiceSettingsPage() {
  await requireAccess("notas", 1);
  const { invoice } = await getFinanceSettings();
  const pct = (n: number) => String(n).replace(".", ",");

  return (
    <>
      <PageHeader
        title="Configurações de nota fiscal"
        subtitle="Dados usados na emissão da NFS-e pelo Asaas. Confirme o código do serviço e a alíquota com seu contador."
        back={{ href: "/admin/notas-fiscais", label: "Notas fiscais" }}
      />
      <div className="adm-detail">
        <section className="adm-card">
          <ActionForm action={saveInvoiceSettings} submitLabel="Salvar configurações">
            <fieldset className="adm-fieldset">
              <legend>Emissão (NFS-e pelo Asaas)</legend>
              <Check name="autoIssue" label="Emitir a nota automaticamente quando o pagamento for confirmado" checked={invoice.autoIssue} />
              <Input label="Código do serviço municipal" name="municipalServiceCode" defaultValue={invoice.municipalServiceCode} placeholder="Ex.: 01.07" />
              <Input label="Alíquota de ISS (%)" name="issPercent" inputMode="decimal" defaultValue={pct(invoice.issPercent)} />
              <Input label="Nome do serviço municipal" name="municipalServiceName" defaultValue={invoice.municipalServiceName} wide />
              <Input
                label="Discriminação na nota"
                name="invoiceDescription"
                defaultValue={invoice.description}
                wide
                hint="{descricao} vira a descrição do lançamento."
              />
              <Check name="retainIss" label="ISS retido pelo tomador" checked={invoice.retainIss} />
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
              <li>No Asaas, em Notas Fiscais, cadastre os dados da prefeitura (inscrição municipal, certificado digital, regime).</li>
              <li>No webhook do Asaas, marque também os eventos de nota fiscal (INVOICE_*), para o portal receber número, PDF e XML.</li>
              <li>Notas emitidas direto no portal da prefeitura podem ser registradas em “+ Registrar nota”, com PDF e XML.</li>
            </ol>
          </section>
        </aside>
      </div>
    </>
  );
}
