// Endereços que a Vercel atribui ao deploy (produção, branch e preview), aceitos como origem do login.
export const vercelOrigins = [process.env.VERCEL_PROJECT_PRODUCTION_URL, process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

/** Endereço público do site. Aceita BETTER_AUTH_URL com aspas, espaços, barra no final ou sem "https://"; se for inválida, usa o da Vercel. */
function resolveSiteUrl() {
  const raw = process.env.BETTER_AUTH_URL?.trim().replace(/^["']|["']$/g, "").trim();
  if (raw) {
    try {
      return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
    } catch {
      console.warn("[gardsoft] BETTER_AUTH_URL inválida; usando o endereço da Vercel.");
    }
  }
  return vercelOrigins[0] ?? "http://localhost:3000";
}

export const siteUrl = resolveSiteUrl();
