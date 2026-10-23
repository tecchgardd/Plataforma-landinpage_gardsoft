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
| `src/app/api/arquivos/[tipo]/[id]` | Download de anexos de clientes e projetos (exige login) |

## Segurança

- Não existe cadastro público: novos administradores só são criados por quem já está logado (**Minha conta**).
- Troque a senha padrão "admin" antes de publicar. O portal avisa enquanto ela estiver em uso.
- O login tem limite de 5 tentativas por minuto. As sessões duram 14 dias.
- Todas as páginas e ações do portal verificam a sessão no servidor.
- Uploads aceitam só JPG, PNG, WEBP e GIF de até 5 MB. O tipo é conferido pelo conteúdo do arquivo.
- O formulário do site tem campo anti-robô e limite de envios por IP. Esse limite é guardado em memória, por instância do servidor.
