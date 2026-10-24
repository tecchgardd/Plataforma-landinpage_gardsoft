import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { asaasConfigured } from "@/lib/integrations/asaas";
import { emailConfigured } from "@/lib/integrations/email";
import { saveEntry } from "../../../../_actions/finance";
import EntryFields from "../../EntryFields";

export const metadata = { title: "Nova cobrança" };

export default async function NewChargePage() {
  await requireUser();
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const asaas = asaasConfigured();
  return (
    <>
      <PageHeader
        title="Nova cobrança"
        subtitle="Lance o que o cliente precisa pagar. Dá para gerar o boleto/Pix e enviar por e-mail na hora."
        back={{ href: "/admin/financeiro/cobrancas", label: "Cobranças" }}
      />
      <div className="adm-card">
        <ActionForm action={saveEntry.bind(null, null)} submitLabel="Lançar cobrança">
          <EntryFields
            type="receber"
            clients={clients}
            projects={projects}
            isNew
            extra={
              <fieldset className="adm-fieldset">
                <legend>Enviar ao cliente</legend>
                {asaas ? (
                  <>
                    <label className="adm-check wide">
                      <input type="checkbox" name="autoCharge" value="1" defaultChecked />
                      <span>Gerar boleto/Pix no Asaas agora (1º vencimento)</span>
                    </label>
                    {emailConfigured() && (
                      <label className="adm-check wide">
                        <input type="checkbox" name="autoEmail" value="1" />
                        <span>Enviar a cobrança por e-mail ao cliente</span>
                      </label>
                    )}
                  </>
                ) : (
                  <p className="adm-card-sub wide">Configure o Asaas em Financeiro → Configurações para gerar boleto/Pix automaticamente.</p>
                )}
              </fieldset>
            }
          />
        </ActionForm>
      </div>
    </>
  );
}
