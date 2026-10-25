-- AlterTable
ALTER TABLE "user" ADD COLUMN     "role_id" UUID;

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Perfis do sistema (os padrões ficam em src/lib/permissions.ts)
INSERT INTO "roles" ("id", "key", "name", "description", "system", "permissions") VALUES
  ('00000000-0000-4000-8000-000000000001', 'super_admin', 'Super admin', 'Acesso total a todos os módulos. Não pode ser restringido.', true, '{}'),
  ('00000000-0000-4000-8000-000000000002', 'gestor', 'Gestor', 'Gerência: comercial, projetos e campanhas completos; financeiro sem exclusão.', true,
   '{"dashboard":1,"leads":3,"clientes":3,"projetos":3,"orcamentos":3,"contratos":3,"documentos":3,"empresa":1,"financeiro":2,"notas":2,"campanhas":3,"bi":1,"usuarios":1,"perfis":0,"conteudo":2,"historico":1}'),
  ('00000000-0000-4000-8000-000000000003', 'atendente', 'Atendente', 'Atendimento: leads, clientes, projetos e orçamentos. Sem financeiro e sem administração.', true,
   '{"dashboard":1,"leads":2,"clientes":2,"projetos":2,"orcamentos":2,"contratos":1,"documentos":2,"empresa":0,"financeiro":0,"notas":0,"campanhas":1,"bi":0,"usuarios":0,"perfis":0,"conteudo":0,"historico":0}');

-- Quem já usa o portal continua com acesso total.
UPDATE "user" SET "role_id" = '00000000-0000-4000-8000-000000000001' WHERE "role_id" IS NULL;
