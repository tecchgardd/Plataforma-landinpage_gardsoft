import "server-only";
import { getFinanceSettings, defaultFinanceSettings } from "@/lib/finance/settings";
import { getContent } from "@/lib/content";

export type LegalInfo = {
  legalName: string;
  tradeName: string;
  document: string;
  address: string;
  cityState: string;
  email: string;
  whatsapp: string;
  jurisdiction: string;
};

/**
 * Dados legais da empresa para rodapé e políticas.
 * Vêm de /admin/financeiro (configurações da empresa); o contato cai para o do site quando vazio.
 */
export async function getLegalInfo(): Promise<LegalInfo> {
  let settings = defaultFinanceSettings;
  if (process.env.DATABASE_URL) {
    try {
      settings = await getFinanceSettings();
    } catch (error) {
      console.error("Falha ao ler os dados da empresa; usando o padrão.", error);
    }
  }
  const site = await getContent("site");
  const { company, contract } = settings;
  return {
    legalName: company.legalName || "Gardsoft",
    tradeName: company.tradeName || "Gardsoft",
    document: company.document,
    address: [company.address, company.zipCode && `CEP ${company.zipCode}`].filter(Boolean).join(" · "),
    cityState: company.cityState,
    email: company.email || site.email,
    whatsapp: site.whatsapp || company.phone.replace(/\D/g, ""),
    jurisdiction: contract.jurisdiction || company.cityState,
  };
}
