import type { Metadata } from "next";
import LegalPage, { ContactChannels, companyLine } from "@/components/legal/LegalPage";
import { getLegalInfo } from "@/lib/legal";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Termos de serviço — Gardsoft",
  description: "Regras de uso do site da Gardsoft e condições gerais para a contratação dos nossos serviços.",
};

export default async function TermsPage() {
  const info = await getLegalInfo();
  return (
    <LegalPage
      title="Termos de serviço"
      updated="23 de outubro de 2026"
      info={info}
      intro={
        <p>
          Estes termos valem para quem navega neste site e para quem pede um orçamento à {companyLine(info)}. Ao usar o
          site, você concorda com eles. A contratação de um projeto é sempre formalizada em contrato próprio, que prevalece
          sobre estes termos no que for específico.
        </p>
      }
    >
      <h2>1. O que oferecemos</h2>
      <p>
        A Gardsoft desenvolve sites, landing pages, sistemas web e automações sob medida. As descrições deste site são
        informativas: escopo, prazo e valor de cada projeto são definidos em proposta e contrato específicos.
      </p>

      <h2>2. Orçamentos e propostas</h2>
      <ul>
        <li>Enviar o formulário ou chamar no WhatsApp não cria nenhuma obrigação de contratar, para nenhuma das partes.</li>
        <li>Cada proposta indica o escopo, o valor, a forma de pagamento e a sua validade.</li>
        <li>O projeto começa após a assinatura do contrato e o primeiro pagamento combinado.</li>
      </ul>

      <h2>3. Como trabalhamos</h2>
      <p>
        O projeto segue as etapas de briefing, protótipo, design, codificação e testes, briefing de entrega e publicação.
        Cada etapa visual inclui até duas rodadas de ajustes; itens fora do escopo aprovado são orçados à parte. Os prazos
        dependem do envio dos materiais (textos, imagens, acessos) e das aprovações do cliente.
      </p>

      <h2>4. Resultados</h2>
      <p>
        Trabalhamos com boas práticas de design, desempenho e SEO, mas resultados como posição no Google, número de
        contatos ou vendas dependem de fatores fora do nosso controle (mercado, investimento em divulgação, concorrência).
        Por isso, não prometemos resultados comerciais específicos.
      </p>

      <h2>5. Propriedade intelectual</h2>
      <ul>
        <li>
          Textos, marca, logotipo e o design deste site pertencem à Gardsoft e não podem ser copiados sem autorização.
        </li>
        <li>
          As marcas, imagens e capturas de tela exibidas nos cases pertencem aos respectivos clientes e aparecem aqui apenas
          para apresentar o trabalho realizado.
        </li>
        <li>
          Após a quitação integral, o cliente recebe o direito de uso do projeto entregue, conforme o contrato. Bibliotecas e
          ferramentas de uso geral da Gardsoft continuam sendo dela.
        </li>
        <li>O cliente é responsável por ter os direitos de uso dos textos, imagens e marcas que nos envia.</li>
      </ul>

      <h2>6. Uso adequado do site</h2>
      <p>
        Não é permitido usar o site para enviar conteúdo ilícito, tentar acessar áreas restritas, sobrecarregar o serviço ou
        coletar dados de forma automatizada.
      </p>

      <h2>7. Links externos</h2>
      <p>
        O site traz links para projetos de clientes, WhatsApp e redes sociais. Não respondemos pelo conteúdo nem pelas
        práticas desses serviços de terceiros.
      </p>

      <h2>8. Privacidade e cancelamento</h2>
      <p>
        O tratamento de dados pessoais segue a nossa <a href="/privacidade">Política de privacidade</a>. As regras de
        desistência e reembolso estão na <a href="/reembolso">Política de reembolso</a>.
      </p>

      <h2>9. Lei aplicável e foro</h2>
      <p>
        Estes termos seguem a legislação brasileira, incluindo o Código de Defesa do Consumidor quando aplicável.
        {info.jurisdiction
          ? ` Fica eleito o foro da comarca de ${info.jurisdiction}, ressalvado o direito do consumidor de propor ação no foro do seu domicílio.`
          : " Eventuais conflitos serão resolvidos no foro do domicílio do consumidor, quando aplicável, ou no da sede da Gardsoft."}
      </p>

      <h2>10. Fale com a gente</h2>
      <ContactChannels info={info} />
    </LegalPage>
  );
}
