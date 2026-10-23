import { Input, Select, TextArea } from "@/components/admin/Fields";
import type { Client } from "@/lib/prisma";

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export default function ClientFields({
  client,
  team,
}: {
  client?: Client;
  team: { id: string; name: string }[];
}) {
  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>Empresa</legend>
        <Input label="Empresa (razão social ou nome fantasia)" name="company" defaultValue={client?.company} wide />
        <Input label="CPF / CNPJ" name="document" defaultValue={client?.document} placeholder="Somente números ou formatado" />
        <Input label="Inscrição estadual" name="stateRegistration" defaultValue={client?.stateRegistration} placeholder="Isento, se for o caso" />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Contato</legend>
        <Input label="Nome do responsável" name="name" defaultValue={client?.name} required />
        <Input label="Telefone / WhatsApp" name="phone" type="tel" inputMode="tel" defaultValue={client?.phone} />
        <Input label="E-mail" name="email" type="email" defaultValue={client?.email} />
        <Select
          label="Atendido por"
          name="ownerId"
          options={team.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={client?.ownerId}
          empty="Sem responsável"
        />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Endereço (para nota fiscal)</legend>
        <Input label="Endereço" name="address" defaultValue={client?.address} placeholder="Rua, número, bairro" wide />
        <Input label="CEP" name="zipCode" defaultValue={client?.zipCode} inputMode="decimal" />
        <Input label="Cidade" name="city" defaultValue={client?.city} />
        <Select label="UF" name="state" options={UFS.map((uf) => ({ value: uf, label: uf }))} defaultValue={client?.state} empty="—" />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Observações</legend>
        <TextArea label="Anotações" name="notes" defaultValue={client?.notes} wide rows={4} />
      </fieldset>
    </>
  );
}
