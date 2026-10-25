# Gardsoft — site e portal

Landing page da Gardsoft e portal de administração em Next.js 16 (App Router + TypeScript).

- **Site** (`/`): landing page com o conteúdo editável pelo portal. O formulário de contato salva os leads no banco.
- **Portal** (`/admin`):
  - **Dashboard:** leads do mês (novos, em contato, sem interesse, fechados), receita por tipo de serviço, funil, temperatura, leads por dia e desempenho das campanhas, com seletor de mês.
  - **Leads:** lista única com filtros rápidos, troca de status na linha, repescagem e responsável.
  - **Clientes:** CPF/CNPJ, inscrição estadual, endereço para nota fiscal e documentos anexados.
  - **Projetos:** quadro estilo Trello (arrastar e soltar) com modal de escopo, links (GitHub, preview, design, docs), checklist, atualizações e documentação.
  - **Campanhas:** vários canais, investimentos detalhados por tipo e link rastreável (UTM) por canal.
  - **Conteúdo do site:** todas as seções da landing, do topo ao rodapé, escolhidas por menu suspenso.
  - **Comercial** (grupo no menu):
    - **Orçamentos:** itens com descrição, quantidade e valor, desconto, validade e condições. PDF e link público para o cliente aprovar ou recusar; aprovado, vira contrato com um clique.
    - **Contratos:** gerados a partir do cliente, do projeto ou do orçamento, PDF com a identidade da Gardsoft, link de assinatura eletrônica (desenho da assinatura, CPF/CNPJ validado, IP, data e código de verificação SHA-256).
    - **Financeiro:** visão geral do mês, contas a receber e a pagar (parcelas e recorrência), baixa com comprovante, receitas e despesas por categoria, boleto/Pix pelo Asaas e e-mails pelo Resend.
    - **Notas fiscais:** NFS-e emitidas pelo Asaas e notas emitidas no portal da prefeitura (com PDF e XML), com filtros de emitidas, pendentes, canceladas e com erro.
    - **Perfil da empresa:** razão social, CNPJ, inscrições, endereço, representante legal e dados bancários.
    - **Configuração CT:** preâmbulo (qualificação das partes), cláusulas e foro do contrato, e os padrões do orçamento.
  - **Perfil** com foto, **Usuários** (criar, editar, redefinir senha, excluir) e **Histórico** de tudo o que é feito no portal.

Stack: Prisma 7 + Postgres (Neon), Better Auth (usuário/e-mail e senha), Zod.

## Rodar no Windows

```powershell
npm.cmd ci
npm.cmd run dev
```

Abra http://localhost:3000/admin e entre com o usuário **admin**.

Não existe tela de cadastro. Quando o banco não tem nenhum usuário, o administrador inicial é criado automaticamente com `ADMIN_USERNAME` e `ADMIN_PASSWORD` do `.env.local`. Em desenvolvimento, sem essas variáveis, o acesso é `admin` / `admin`. Em produção, ele só é criado se `ADMIN_PASSWORD` estiver definida. Enquanto a senha for "admin", o portal mostra um aviso para trocá-la em **Minha conta**. Outros administradores são cadastrados ali também.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres usado pelo site. No Neon, use a conexão com `-pooler`. |
| `DIRECT_URL` | Conexão direta (sem `-pooler`), usada pelas migrações. |
| `BETTER_AUTH_SECRET` | Segredo da autenticação (32+ caracteres). Gere com `npx @better-auth/cli secret`. |
| `BETTER_AUTH_URL` | Endereço público do site, ex.: `https://gardsoft.com.br`. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_NAME` | Administrador inicial, criado só quando o banco não tem usuários. |
| `NEXT_PUBLIC_*` | Contatos iniciais. Depois edite em **Conteúdo do site → Contatos e redes**. |

## Banco de dados (Prisma)

O schema fica em `prisma/schema.prisma` e as migrações em `prisma/migrations/`.

| Comando | Uso |
| --- | --- |
| `npm run db:migrate -- --name descricao` | Depois de alterar o schema: cria a migração e aplica no banco. |
| `npm run db:deploy` | Aplica as migrações pendentes (produção / CI). |
| `npm run db:studio` | Abre o Prisma Studio para ver e editar os dados. |

O client do Prisma é gerado em `src/generated/prisma` no `npm install` e no `build`.

## Financeiro: integrações

Sem chaves, o módulo funciona em modo manual: o contrato gera um link para enviar pelo WhatsApp e as baixas são feitas à mão com comprovante.

| Variável | Uso |
| --- | --- |
| `ASAAS_API_KEY`, `ASAAS_ENV` | Boleto/Pix, baixa automática e NFS-e. Use `sandbox` para testar e `production` para valer. |
| `ASAAS_WEBHOOK_TOKEN` | Token do webhook. No Asaas, cadastre `https://SEU-DOMINIO/api/webhooks/asaas` com este mesmo token, para eventos de cobranças e notas fiscais. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Fotos e vídeos do site e do portal, enviados direto do navegador para o Cloudinary e entregues já otimizados. Sem elas, as imagens ficam no banco e vídeos não podem ser enviados. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Envio de contratos, cobranças e confirmações por SMTP (ex.: Gmail com senha de app). Quando preenchido, tem preferência sobre o Resend. |
| `RESEND_API_KEY`, `MAIL_FROM` | Alternativa ao SMTP. O domínio do remetente precisa estar verificado no Resend. |

O passo a passo também aparece no portal, em **Financeiro → Cobrança e integrações** (forma de cobrança, multa e juros). Os dados da empresa ficam em **Perfil da empresa**, o modelo de contrato em **Configuração CT** (revise as cláusulas com um advogado) e o código de serviço/ISS em **Notas fiscais → Configurações** (confirme com o contador).

Fluxo: **Lead ou cliente → Orçamento → Cliente aprova pelo link → Gerar contrato → Enviar → Cliente assina pelo link → Parcelas lançadas (e cobranças geradas no Asaas, se configurado) → Pagamento confirmado pelo webhook ou baixa manual → Nota fiscal.**

## Tráfego pago: Meta e Google Ads

Sem as chaves, as campanhas funcionam como antes (link rastreável e custos lançados à mão). Com elas:

| Variável | Uso |
| --- | --- |
| `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` | Importa gasto, impressões, cliques e leads de cada campanha do Gerenciador de Anúncios. |
| `META_APP_SECRET`, `META_VERIFY_TOKEN` | Webhook do Lead Ads: cada formulário preenchido num anúncio vira um lead "quente" em **Leads**, já ligado à campanha. No app da Meta, assine o campo `leadgen` com a URL `https://SEU-DOMINIO/api/webhooks/meta`. |
| `GOOGLE_ADS_*` | Importa gasto, impressões, cliques e conversões do Google Ads (token de desenvolvedor + OAuth com refresh token). |
| `CRON_SECRET` | Protege a sincronização diária (`vercel.json` chama `/api/cron/anuncios` todo dia às 6h de Brasília). |

Em **Campanhas**, use "Importar campanhas" (cria e vincula) ou vincule uma campanha existente na página dela. O gasto importado entra no investimento e alimenta o custo por lead e o ROI no **BI e metas**.

## Perfis de acesso

Cada usuário tem um perfil (Administração → Perfis de acesso). Para cada módulo, o perfil define: sem acesso, ver, editar ou excluir. A regra vale no menu, nas páginas, nas ações e nos downloads.

- **Super admin**: acesso total, sempre. Só um super admin cria ou remove outro, e sempre sobra pelo menos um.
- **Gestor** e **Atendente** vêm com padrões e podem ser ajustados. Dá para criar novos perfis.
- Ninguém muda o próprio perfil nem as permissões do perfil que usa.
- Os padrões ficam em `src/lib/permissions.ts`. Um módulo novo precisa entrar ali e usar `requireAccess("modulo", nivel)`.

## Publicar (Vercel + Neon)

1. Na Vercel, configure `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` e `ADMIN_PASSWORD` (com uma senha forte).
2. Rode `npm run db:deploy` para aplicar as migrações. Ele também pode ir no comando de build da Vercel: `prisma migrate deploy && npm run build`.
3. Acesse `/admin` com o usuário definido em `ADMIN_USERNAME`.

## Estrutura

| Caminho | Uso |
| --- | --- |
| `src/app/page.tsx` | Landing page (lê o conteúdo do banco, com fallback para `src/data/defaults.ts`) |
| `src/app/actions/lead.ts` | Recebe o formulário do site (validação, anti-spam, UTM → campanha) |
| `src/app/admin/` | Portal: `login`, `(panel)/` com as páginas e `_actions/` com as server actions |
| `src/app/api/auth/[...all]` | Rotas do Better Auth |
| `src/app/api/media/[id]` | Serve as imagens enviadas pelo portal |
| `prisma/schema.prisma` | Tabelas (auth, leads, clientes, projetos, campanhas, conteúdo, mídia) |
| `src/lib/prisma.ts` | Client do Prisma (adaptador `pg`) e conversão de datas |
| `src/lib/auth.ts` | Better Auth (login por usuário ou e-mail, cadastro público desligado) e criação do admin inicial |
| `src/lib/content-schema.ts` | Formato de cada seção editável do site |
| `src/app/admin/(panel)/conteudo/specs.ts` | Campos do editor de conteúdo. Para tornar um novo texto editável, comece aqui. |
| `src/proxy.ts` | Redireciona para o login quem não tem sessão (checagem rápida; a validação real fica no servidor) |
| `src/data/defaults.ts` | Conteúdo padrão do site |
| `src/lib/activity.ts` | Registro do histórico (`logActivity`) e lista da equipe |
| `src/lib/files.ts` | Validação dos anexos (tipo conferido pelo conteúdo, até 10 MB) |
| `src/app/api/arquivos/[tipo]/[id]` | Download de anexos de clientes, projetos e financeiro (exige login) |
| `src/lib/finance/` | Orçamento e contrato (numeração, hash, PDF), notas fiscais, cobranças e configurações comerciais |
| `src/lib/integrations/` | Clientes do Asaas, de e-mail (SMTP/Resend) e do Cloudinary |
| `src/app/orcamento/[token]` | Página pública de aprovação do orçamento |
| `src/app/contrato/[token]` | Página pública de assinatura do contrato |
| `src/app/api/webhooks/asaas` | Webhook do Asaas (baixa automática e nota fiscal) |
| `src/lib/permissions.ts`, `src/lib/access.ts` | Módulos, níveis, perfis padrão e `requireAccess` |
| `src/lib/documents.ts` | Tipos de documento do projeto e os modelos de seções (TAP, escopo, MER...) |
| `src/app/documento/[token]` | Página pública de leitura e aprovação dos documentos do projeto |
| `src/lib/bi-data.ts` | Indicadores do BI (série mensal, vendas por serviço, campanhas, metas) |
| `src/lib/ads-sync.ts`, `src/lib/integrations/meta.ts`, `google-ads.ts` | Sincronização de anúncios |
| `src/app/api/webhooks/meta` | Webhook do Meta Lead Ads |

## Segurança

- Não existe cadastro público: novos usuários só são criados em **Administração → Usuários**, por quem tem permissão.
- Troque a senha padrão "admin" antes de publicar. O portal avisa enquanto ela estiver em uso.
- O login tem limite de 5 tentativas por minuto. As sessões duram 14 dias.
- Todas as páginas, ações e downloads do portal verificam a sessão e o perfil de acesso no servidor.
- Uploads aceitam só JPG, PNG, WEBP e GIF de até 5 MB. O tipo é conferido pelo conteúdo do arquivo.
- O formulário do site tem campo anti-robô e limite de envios por IP. Esse limite é guardado em memória, por instância do servidor.
