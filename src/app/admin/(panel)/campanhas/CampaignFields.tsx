import { Input, Select, TextArea } from "@/components/admin/Fields";
import { fromDbDate, type Campaign } from "@/lib/prisma";
import { campaignChannels, campaignStatuses } from "@/lib/admin/options";
import CostsEditor from "./CostsEditor";

export default function CampaignFields({
  campaign,
  costs = [],
}: {
  campaign?: Campaign;
  costs?: { type: string; description: string | null; amountCents: number }[];
}) {
  const selected = new Set(campaign?.channels ?? []);
  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>Campanha</legend>
        <Input label="Nome da campanha" name="name" defaultValue={campaign?.name} required placeholder="Ex.: Landing pages — outubro" />
        <Select label="Status" name="status" options={campaignStatuses} defaultValue={campaign?.status ?? "planejada"} />
        <Input label="Início" name="startDate" type="date" defaultValue={fromDbDate(campaign?.startDate)} />
        <Input label="Término" name="endDate" type="date" defaultValue={fromDbDate(campaign?.endDate)} />
        <div className="adm-field wide" role="group" aria-labelledby="canais-label">
          <span className="adm-label" id="canais-label">
            Canais onde a campanha está rodando
          </span>
          <div className="adm-checks">
            {campaignChannels.map((c) => (
              <label key={c.value} className="adm-check-pill">
                <input type="checkbox" name="channels" value={c.value} defaultChecked={selected.has(c.value)} />
                <span>{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Investimento</legend>
        <CostsEditor initial={costs} />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Anotações</legend>
        <TextArea label="Anotações" name="notes" defaultValue={campaign?.notes} wide placeholder="Público, oferta, criativos, resultados..." />
      </fieldset>
    </>
  );
}
