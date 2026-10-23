// Lista os usuários do portal e redefine a senha de um deles.
// Uso: node scripts/reset-password.mjs                 → só lista
//      node scripts/reset-password.mjs <usuario> <senha> → redefine (cria o login por senha se faltar)
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import pg from "pg";
import { hashPassword } from "better-auth/crypto";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL não configurada. Crie o .env.local (veja o .env.example).");
  process.exit(1);
}

const [login, password] = process.argv.slice(2);
const db = new pg.Client({ connectionString });
await db.connect();

try {
  const { rows } = await db.query(`
    SELECT u.id, u.username, u.email, a.id AS account_id, a.password IS NOT NULL AS has_password
    FROM "user" u
    LEFT JOIN account a ON a.user_id = u.id AND a.provider_id = 'credential'
    ORDER BY u.created_at`);
  console.table(rows.map((r) => ({ username: r.username, email: r.email, login_por_senha: r.account_id ? (r.has_password ? "ok" : "sem senha") : "FALTANDO" })));

  if (login) {
    if (!password || password.length < 8) throw new Error("Informe uma senha com pelo menos 8 caracteres.");
    const key = login.trim().toLowerCase();
    const user = rows.find((r) => r.username === key || r.email === key);
    if (!user) throw new Error(`Usuário "${login}" não encontrado.`);
    const hash = await hashPassword(password);
    if (user.account_id) {
      await db.query(`UPDATE account SET password = $1, updated_at = now() WHERE id = $2`, [hash, user.account_id]);
    } else {
      await db.query(
        `INSERT INTO account (id, account_id, provider_id, user_id, password) VALUES ($1, $2, 'credential', $2, $3)`,
        [randomUUID(), user.id, hash],
      );
    }
    console.log(`Senha de "${user.username ?? user.email}" redefinida.`);
  }
} finally {
  await db.end();
}
