import type { Metadata } from "next";
import LegalPage, { ContactChannels, companyLine } from "@/components/legal/LegalPage";
import { getLegalInfo } from "@/lib/legal";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Política de reembolso — Gardsoft",
  description: "Direito de arrependimento, cancelamento e reembolso nos projetos contratados com a Gardsoft.",
};

export default async function RefundPage() {
  const info = await getLegalInfo();
  return (
    <LegalPage
      title="Política de reembolso"
      updated="23 de outubro de 2026"
      info={info}
      intro={
        <p>
          Nossos projetos são feitos sob medida e em etapas. Esta política explica, sem letras miúdas, como funcionam a
          desistência, o cancelamento e o reembolso nos serviços da {companyLine(info)}. Se o seu contrato tiver regra
          diferente e mais favorável a você, vale a do contrato.
        </p>
      }
    >
      <h2>1. Direito de arrependimento (7 dias)</h2>
      <p>
        Como a contratação é feita a distância (internet, WhatsApp, assinatura eletrônica), você pode desistir em até 7
        dias corridos a partir da assinatura do contrato, sem precisar justificar, conforme o art. 49 do Código de Defesa do
        Consumidor. Nesse caso, devolvemos integralmente os valores pagos.
      </p>

      <h2>2. Cancelamento depois de 7 dias</h2>
      <p>
        Depois desse prazo, qualquer das partes pode encerrar o contrato com aviso por escrito de 15 dias, como prevê o
        contrato. Nesse caso:
      </p>
      <ul>
        <li>são devidos apenas os valores das etapas já executadas ou em execução até o aviso;</li>
        <li>o que tiver sido pago além disso é devolvido;</li>
        <li>entregamos ao cliente o material das etapas pagas (por exemplo, protótipo e layouts aprovados).</li>
      </ul>

      <h2>3. Quando não há reembolso</h2>
      <ul>
        <li>Etapas já concluídas e aprovadas pelo cliente.</li>
        <li>Projeto já entregue e publicado.</li>
        <li>
          Custos de terceiros contratados em nome do cliente e já pagos, como domínio, hospedagem, licenças ou ferramentas —
          eles seguem as regras de cada fornecedor.
        </li>
      </ul>

      <h2>4. Se o problema for nosso</h2>
      <p>
        Se a Gardsoft deixar de cumprir o que foi contratado e não corrigir após ser avisada, você pode cancelar e receber
        de volta os valores referentes à parte não entregue, sem prejuízo dos demais direitos previstos em lei.
      </p>

      <h2>5. Como pedir e prazo de devolução</h2>
      <p>
        Peça o cancelamento ou o reembolso por escrito, por e-mail ou WhatsApp, informando o nome do projeto. Confirmamos
        o recebimento e os valores apurados, e a devolução é feita em até 10 dias úteis, pelo mesmo meio de pagamento ou
        por Pix para conta de mesma titularidade.
      </p>
      <ContactChannels info={info} />
    </LegalPage>
  );
}
