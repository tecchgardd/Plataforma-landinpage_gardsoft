import ActionButton from "@/components/admin/ActionButton";
import { dateTime, money } from "@/lib/admin/format";
import { lastAdsSync } from "@/lib/ads-sync";
import { googleAdsConfigured } from "@/lib/integrations/google-ads";
import { metaConfigured, metaLeadsConfigured } from "@/lib/integrations/meta";
import { siteUrl } from "@/lib/site-url";
import { importAdCampaigns, syncAdsNow } from "../../_actions/campaigns";

/** Estado das integrações de tráfego pago (Meta e Google Ads) e ações de sincronizar/importar. */
export default async function AdsIntegrations({ canEdit }: { canEdit: boolean }) {
  const meta = metaConfigured();
  const metaLeads = metaLeadsConfigured();
  const google = googleAdsConfigured();
  const last = await lastAdsSync();
  const result = (p: "meta" | "google") => last?.results?.find((r) => r.platform === p);

  const Status = ({ ok, label }: { ok: boolean; label: string }) => (
    <li className={ok ? "ok" : ""}>
      <span aria-hidden="true">{ok ? "✓" : "○"}</span> {label}
    </li>
  );

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <div>
          <h2>Tráfego pago: Meta e Google Ads</h2>
          <p className="adm-card-sub">
            Os leads dos formulários do Meta entram sozinhos em Leads. O gasto, os cliques e as conversões são importados todo dia e entram no investimento de cada
            campanha.
            {last?.lastSync && ` Última sincronização: ${dateTime(new Date(last.lastSync))}.`}
          </p>
        </div>
        {canEdit && (meta || google) && (
          <ActionButton action={syncAdsNow} pendingText="Sincronizando...">
            Sincronizar agora
          </ActionButton>
        )}
      </div>

      <div className="adm-ads-grid">
        <div className="adm-ads-platform">
          <strong>Meta Ads (Facebook e Instagram)</strong>
          <ul className="adm-integrations">
            <Status ok={meta} label={meta ? "Métricas conectadas" : "Métricas: falta META_ACCESS_TOKEN e META_AD_ACCOUNT_ID"} />
            <Status ok={metaLeads} label={metaLeads ? "Leads dos formulários conectados" : "Leads: falta META_APP_SECRET e META_VERIFY_TOKEN"} />
          </ul>
          {result("meta") && (
            <small className={result("meta")!.ok ? "adm-sub" : "adm-sub neg"}>
              {result("meta")!.ok ? `${result("meta")!.campaigns} campanha(s) · ${money(result("meta")!.spendCents)} em 30 dias` : `Falhou: ${result("meta")!.error}`}
            </small>
          )}
          {!metaLeads && (
            <details>
              <summary>Como conectar</summary>
              <ol className="adm-steps">
                <li>Crie um app em developers.facebook.com (tipo Empresa) e um usuário do sistema no Business Manager com acesso à conta de anúncios e à Página.</li>
                <li>Gere o token com ads_read, leads_retrieval, pages_show_list, pages_read_engagement e pages_manage_metadata.</li>
                <li>
                  Em Webhooks → Page, assine o campo <b>leadgen</b> com a URL <code className="adm-code">{`${siteUrl}/api/webhooks/meta`}</code> e o mesmo texto de
                  META_VERIFY_TOKEN.
                </li>
                <li>Preencha as variáveis META_* na Vercel e faça um novo deploy.</li>
              </ol>
            </details>
          )}
          {canEdit && meta && (
            <ActionButton action={importAdCampaigns.bind(null, "meta")} className="adm-btn ghost small" pendingText="Importando...">
              Importar campanhas do Meta
            </ActionButton>
          )}
        </div>

        <div className="adm-ads-platform">
          <strong>Google Ads</strong>
          <ul className="adm-integrations">
            <Status ok={google} label={google ? "Métricas conectadas" : "Falta configurar as variáveis GOOGLE_ADS_*"} />
          </ul>
          {result("google") && (
            <small className={result("google")!.ok ? "adm-sub" : "adm-sub neg"}>
              {result("google")!.ok ? `${result("google")!.campaigns} campanha(s) · ${money(result("google")!.spendCents)} em 30 dias` : `Falhou: ${result("google")!.error}`}
            </small>
          )}
          {!google && (
            <details>
              <summary>Como conectar</summary>
              <ol className="adm-steps">
                <li>Na conta de administrador do Google Ads, abra Ferramentas → Centro de API e peça o token de desenvolvedor.</li>
                <li>No Google Cloud, ative a Google Ads API e crie credenciais OAuth (app para computador).</li>
                <li>Gere o refresh token uma vez com a conta que acessa o Google Ads.</li>
                <li>Preencha as variáveis GOOGLE_ADS_* na Vercel (o ID da conta é o número do canto superior do Google Ads).</li>
              </ol>
            </details>
          )}
          {canEdit && google && (
            <ActionButton action={importAdCampaigns.bind(null, "google")} className="adm-btn ghost small" pendingText="Importando...">
              Importar campanhas do Google Ads
            </ActionButton>
          )}
        </div>
      </div>
    </section>
  );
}
