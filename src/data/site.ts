/** Dados fixos da marca. Contatos e textos editáveis ficam no portal (/admin/conteudo). */
export const site = {
  name: "Gardsoft",
  slogan: "Tecnologia que impulsiona negócios",
  title: "Gardsoft — Tecnologia que impulsiona negócios",
  description:
    "Sites, landing pages, sistemas e automações sob medida. A Gardsoft tira a sua ideia do papel e coloca o seu negócio em movimento no digital.",
};

export const nav = [
  { href: "#servicos", label: "Serviços" },
  { href: "#historia", label: "Nossa história" },
  { href: "#cases", label: "Cases" },
  { href: "#processo", label: "Processo" },
  { href: "#avaliacoes", label: "Avaliações" },
];

/** Link do WhatsApp. `phone`: somente dígitos, com país e DDD. Vazio quando o número é inválido. */
export function whatsappLink(phone: string, text?: string) {
  const digits = phone.replace(/\D/g, "");
  if (!/^\d{10,15}$/.test(digits)) return "";
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
