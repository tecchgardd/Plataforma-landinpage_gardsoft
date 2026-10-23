import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import { Input, Select } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/session";
import { formatCpfCnpj } from "@/lib/finance/document";
import { getFinanceSettings } from "@/lib/finance/settings";
import { saveCompanyProfile } from "../../_actions/settings";

export const metadata = { title: "Perfil da empresa" };

const taxRegimes = [
  { value: "MEI", label: "MEI" },
  { value: "Simples Nacional", label: "Simples Nacional" },
  { value: "Lucro Presumido", label: "Lucro Presumido" },
  { value: "Lucro Real", label: "Lucro Real" },
];

export default async function CompanyPage() {
  await requireUser();
  const { company: c } = await getFinanceSettings();
  const missing = [!c.document && "CNPJ", !c.address && "endereço", !c.representative && "representante legal"].filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title="Perfil da empresa"
        subtitle="Dados da Gardsoft usados nos contratos, orçamentos, cobranças e notas fiscais."
      />
      {missing.length > 0 && <p className="adm-alert">Falta preencher: {missing.join(", ")}. Esses dados aparecem na qualificação das partes do contrato.</p>}

      <div className="adm-detail">
        <section className="adm-card">
          <ActionForm action={saveCompanyProfile} submitLabel="Salvar perfil">
            <fieldset className="adm-fieldset">
              <legend>Identificação</legend>
              <Input label="Razão social" name="legalName" defaultValue={c.legalName} required wide />
              <Input label="Nome fantasia" name="tradeName" defaultValue={c.tradeName} />
              <Input label="CNPJ" name="document" defaultValue={c.document} placeholder="00.000.000/0001-00" />
              <Input label="Inscrição estadual" name="stateRegistration" defaultValue={c.stateRegistration} placeholder="Isento, se não tiver" />
              <Input label="Inscrição municipal" name="municipalRegistration" defaultValue={c.municipalRegistration} hint="Necessária para emitir NFS-e." />
              <Select label="Regime tributário" name="taxRegime" options={taxRegimes} defaultValue={c.taxRegime} empty="Selecione" />
              <Input label="Data de abertura" name="openingDate" type="date" defaultValue={c.openingDate} />
              <Input label="Atividade principal (CNAE)" name="mainActivity" defaultValue={c.mainActivity} wide placeholder="Ex.: 62.01-5-01 — Desenvolvimento de programas de computador sob encomenda" />
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>Endereço e contato</legend>
              <Input label="Endereço" name="address" defaultValue={c.address} wide placeholder="Rua, número, complemento, bairro" />
              <Input label="CEP" name="zipCode" defaultValue={c.zipCode} />
              <Input label="Cidade/UF" name="cityState" defaultValue={c.cityState} placeholder="Porto Alegre/RS" />
              <Input label="E-mail" name="email" type="email" defaultValue={c.email} hint="Recebe cópia dos contratos assinados e avisos de orçamento." />
              <Input label="Telefone" name="phone" defaultValue={c.phone} />
              <Input label="Site" name="website" defaultValue={c.website} />
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>Representante legal</legend>
              <Input label="Nome" name="representative" defaultValue={c.representative} hint="Assina os contratos pela empresa." />
              <Input label="CPF" name="representativeDocument" defaultValue={c.representativeDocument} />
              <Input label="Cargo" name="representativeRole" defaultValue={c.representativeRole} placeholder="Sócio-administrador" />
            </fieldset>
            <fieldset className="adm-fieldset">
              <legend>Dados bancários</legend>
              <Input label="Banco" name="bankName" defaultValue={c.bankName} />
              <Input label="Agência" name="bankAgency" defaultValue={c.bankAgency} />
              <Input label="Conta" name="bankAccount" defaultValue={c.bankAccount} />
              <Input label="Chave Pix" name="pixKey" defaultValue={c.pixKey} />
            </fieldset>
          </ActionForm>
        </section>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Como aparece no contrato</h2>
            <div className="adm-party-preview">
              <span>Contratada</span>
              <strong>{c.legalName || "Gardsoft"}</strong>
              {c.document && <small>CNPJ {formatCpfCnpj(c.document)}</small>}
              {c.address && <small>{c.address}</small>}
              {(c.cityState || c.zipCode) && <small>{[c.cityState, c.zipCode && `CEP ${c.zipCode}`].filter(Boolean).join(" · ")}</small>}
              {c.representative && (
                <small>
                  Representada por {c.representative}
                  {c.representativeRole ? `, ${c.representativeRole}` : ""}
                </small>
              )}
            </div>
            <p className="adm-card-sub" style={{ marginTop: 12 }}>
              O texto que qualifica as partes fica em <Link href="/admin/contratos/configuracao">Configuração CT</Link>.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
