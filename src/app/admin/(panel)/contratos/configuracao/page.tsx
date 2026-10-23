import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import { Input, TextArea } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/session";
import { contractVariables, defaultClauses, defaultPreamble, getFinanceSettings } from "@/lib/finance/settings";
import { saveContractTemplate } from "../../../_actions/settings";

export const metadata = { title: "Configuração CT" };

export default async function ContractTemplatePage() {
  await requireUser();
  const settings = await getFinanceSettings();
  const { contract, quote } = settings;

  return (
    <>
      <PageHeader
        title="Configuração CT"
        subtitle="Modelo do contrato de prestação de serviço e padrões do orçamento. Vale para os próximos documentos; os já criados não mudam."
        back={{ href: "/admin/contratos", label: "Contratos" }}
      />

      <div className="adm-detail">
        <section className="adm-card">
          <ActionForm action={saveContractTemplate} submitLabel="Salvar modelo">
            <fieldset className="adm-fieldset">
              <legend>Qualificação das partes</legend>
              <TextArea
                label="Preâmbulo"
                name="preamble"
                defaultValue={contract.preamble}
                wide
                rows={6}
                hint="Primeiro parágrafo do contrato: identifica a contratada (Gardsoft) e o contratante (cliente)."
              />
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>Cláusulas</legend>
              <Input label="Foro (comarca)" name="jurisdiction" defaultValue={contract.jurisdiction} placeholder="Porto Alegre/RS" />
              <Input label="Prazo de entrega padrão (dias)" name="deliveryDays" inputMode="decimal" defaultValue={contract.deliveryDays ? String(contract.deliveryDays) : ""} />
              <TextArea
                label="Cláusulas padrão"
                name="clauses"
                defaultValue={contract.clauses}
                wide
                rows={22}
                hint="Linhas que começam com “CLÁUSULA” viram títulos no PDF. Peça para um advogado revisar."
              />
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>Orçamento</legend>
              <Input label="Validade padrão (dias)" name="validityDays" inputMode="decimal" defaultValue={String(quote.validityDays)} />
              <TextArea label="Apresentação padrão" name="quoteIntro" defaultValue={quote.intro} wide rows={3} />
              <TextArea label="Forma de pagamento padrão" name="paymentTerms" defaultValue={quote.paymentTerms} wide rows={2} />
              <TextArea label="Observações padrão" name="quoteNotes" defaultValue={quote.notes} wide rows={3} />
            </fieldset>
          </ActionForm>
        </section>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Variáveis</h2>
            <p className="adm-card-sub">Use no preâmbulo e nas cláusulas. Elas são trocadas pelos dados reais ao gerar o contrato.</p>
            <dl className="adm-dl adm-vars">
              {contractVariables.map((v) => (
                <div key={v.key}>
                  <dt className="adm-mono">{v.key}</dt>
                  <dd>{v.label}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="adm-card">
            <h2>De onde vêm os dados</h2>
            <ul className="adm-howto">
              <li>
                Contratada: <Link href="/admin/empresa">Perfil da empresa</Link>.
              </li>
              <li>Contratante: cadastro do cliente (CPF/CNPJ, endereço, cidade e CEP).</li>
              <li>Valor, parcelas e prazo: cada contrato.</li>
            </ul>
          </section>
          <details className="adm-card adm-modal-edit">
            <summary>Ver o modelo original</summary>
            <p className="adm-card-sub">Para recomeçar, copie o texto abaixo para os campos e salve.</p>
            <pre className="adm-pre">{defaultPreamble}</pre>
            <pre className="adm-pre">{defaultClauses}</pre>
          </details>
        </aside>
      </div>
    </>
  );
}
