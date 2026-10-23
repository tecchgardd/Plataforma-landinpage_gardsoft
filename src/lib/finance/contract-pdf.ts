import "server-only";
import { loadContract, publicBaseUrl, verificationCode } from "./contract";
import { renderContractPdf } from "./ContractPdf";
import { getFinanceSettings } from "./settings";

/** Gera o PDF do contrato (com a assinatura, se já assinado). */
export async function contractPdf(where: { id: string } | { token: string }) {
  const loaded = await loadContract(where);
  if (!loaded) return null;
  const { contract, data } = loaded;
  const settings = await getFinanceSettings();
  const signed = contract.status === "assinado" && contract.signedAt && contract.contentHash;
  const buffer = await renderContractPdf({
    data,
    settings,
    issuer: contract.createdBy?.name ?? "Gardsoft",
    issuedAt: contract.sentAt ?? contract.createdAt,
    verifyUrl: `${publicBaseUrl()}/contrato/${contract.token}`,
    signature: signed
      ? {
          signedAt: contract.signedAt!,
          name: contract.signerName ?? "",
          document: contract.signerDocument ?? "",
          email: contract.signerEmail ?? "",
          ip: contract.signerIp ?? "",
          image: contract.signatureImage ?? "",
          hash: contract.contentHash!,
        }
      : null,
  });
  const suffix = signed ? "assinado" : "minuta";
  return {
    buffer,
    filename: `${contract.number}-${suffix}.pdf`,
    contract,
    code: contract.contentHash ? verificationCode(contract.contentHash) : null,
  };
}
