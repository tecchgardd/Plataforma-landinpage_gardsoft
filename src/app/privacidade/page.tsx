import type { Metadata } from "next";
import LegalPage, { ContactChannels, companyLine } from "@/components/legal/LegalPage";
import { getLegalInfo } from "@/lib/legal";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Política de privacidade — Gardsoft",
  description: "Como a Gardsoft coleta, usa e protege os seus dados pessoais, conforme a LGPD (Lei nº 13.709/2018).",
};

export default async function PrivacyPage() {
  const info = await getLegalInfo();
  return (
    <LegalPage
      title="Política de privacidade"
      updated="23 de outubro de 2026"
      info={info}
      intro={
        <p>
          Esta política explica, de forma direta, quais dados pessoais a {companyLine(info)} coleta por este site, por que
          coleta e quais são os seus direitos, de acordo com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        </p>
      }
    >
      <h2>1. Quem é o controlador dos dados</h2>
      <p>
        O controlador dos dados pessoais tratados neste site é a {companyLine(info)}
        {info.cityState ? `, com sede em ${info.cityState}` : ""}. Para qualquer assunto sobre os seus dados, fale com o
        nosso encarregado pelos canais abaixo:
      </p>
      <ContactChannels info={info} />

      <h2>2. Quais dados coletamos</h2>
      <p>Coletamos apenas o necessário para responder ao seu contato:</p>
      <ul>
        <li>
          <strong>Formulário “Qual é a sua ideia?”:</strong> nome, WhatsApp, e-mail (opcional), o serviço de interesse e a
          descrição do projeto que você escrever.
        </li>
        <li>
          <strong>Origem da visita:</strong> quando você chega por um link de campanha, registramos os parâmetros da URL
          (utm_source, utm_medium e utm_campaign) junto com o contato, para saber qual divulgação funcionou.
        </li>
        <li>
          <strong>Endereço IP:</strong> usado apenas no momento do envio, para bloquear excesso de tentativas (proteção contra
          spam). Ele não é gravado junto com o seu contato.
        </li>
        <li>
          <strong>Assinatura de contrato (só para clientes):</strong> ao assinar pelo link que enviamos, registramos nome,
          CPF/CNPJ, e-mail, a assinatura desenhada, data, hora e IP, para comprovar a validade da assinatura eletrônica.
        </li>
      </ul>
      <p>
        Não pedimos documentos, dados bancários nem dados sensíveis pelo site. Não usamos cookies de publicidade nem
        ferramentas de rastreamento de terceiros. A origem da visita fica guardada só na sessão do seu navegador
        (sessionStorage) e é apagada quando você fecha a aba.
      </p>

      <h2>3. Para que usamos e com qual base legal</h2>
      <ul>
        <li>
          <strong>Responder ao seu contato e preparar uma proposta</strong> — com base no seu consentimento (art. 7º, I) e na
          execução de procedimentos preliminares a um contrato, a seu pedido (art. 7º, V).
        </li>
        <li>
          <strong>Medir quais campanhas trazem contatos</strong> — com base no legítimo interesse (art. 7º, IX), usando só os
          parâmetros de origem da visita.
        </li>
        <li>
          <strong>Formalizar e cumprir o contrato assinado</strong> — com base na execução de contrato (art. 7º, V) e no
          cumprimento de obrigação legal (art. 7º, II).
        </li>
        <li>
          <strong>Proteger o formulário contra abuso</strong> — com base no legítimo interesse (art. 7º, IX).
        </li>
      </ul>
      <p>Não vendemos, alugamos nem usamos os seus dados para outras finalidades.</p>

      <h2>4. Com quem compartilhamos</h2>
      <p>
        Os dados ficam armazenados em provedores de infraestrutura contratados pela Gardsoft (hospedagem do site e banco de
        dados), que atuam como operadores e só tratam os dados para manter o serviço funcionando. Alguns desses provedores
        podem armazenar dados fora do Brasil, sempre com garantias de segurança compatíveis com a LGPD (art. 33). Podemos
        ainda compartilhar dados quando houver obrigação legal ou ordem de autoridade competente.
      </p>

      <h2>5. Por quanto tempo guardamos</h2>
      <p>
        Mantemos os dados do contato enquanto houver conversa ou relação comercial em andamento. Se não fecharmos negócio,
        os dados são excluídos em até 24 meses após o último contato — ou antes, se você pedir. Se houver contrato, alguns
        dados podem ser mantidos pelo prazo exigido por lei (por exemplo, obrigações fiscais).
      </p>

      <h2>6. Seus direitos</h2>
      <p>Pela LGPD (art. 18), você pode, a qualquer momento e sem custo:</p>
      <ul>
        <li>confirmar se tratamos os seus dados e acessá-los;</li>
        <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>pedir a anonimização, o bloqueio ou a exclusão de dados desnecessários;</li>
        <li>pedir a portabilidade dos dados;</li>
        <li>revogar o consentimento e pedir a exclusão dos dados tratados com base nele;</li>
        <li>saber com quem compartilhamos os seus dados;</li>
        <li>apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</li>
      </ul>
      <p>Para exercer qualquer um desses direitos, fale com a gente pelos canais da seção 1. Respondemos em até 15 dias.</p>

      <h2>7. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), acesso ao painel restrito a pessoas autorizadas com login e senha, e
        provedores com práticas reconhecidas de segurança. Nenhum sistema é 100% imune a incidentes; se algum ocorrer e
        puder trazer risco a você, comunicaremos você e a ANPD, como manda a lei.
      </p>

      <h2>8. Links para outros sites</h2>
      <p>
        Os cases de sucesso levam a sites de clientes, e há links para WhatsApp e redes sociais. Esses serviços têm políticas
        de privacidade próprias, que não são controladas pela Gardsoft.
      </p>

      <h2>9. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta política para refletir mudanças no site ou na lei. A data no topo da página mostra a versão
        vigente.
      </p>
    </LegalPage>
  );
}
