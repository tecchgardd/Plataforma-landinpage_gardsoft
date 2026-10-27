/**
 * Tempo máximo de uma sessão do portal, em segundos: passado esse tempo desde o login,
 * é preciso entrar de novo. A sessão não é renovada com o uso (prazo fixo).
 */
export const SESSION_MAX_AGE = 60 * 60 * 4;

/** Quando a sessão expira: o que vier primeiro entre o prazo gravado e login + SESSION_MAX_AGE. */
export function sessionExpiry(session: { createdAt: Date | string; expiresAt: Date | string }) {
  const byLogin = new Date(session.createdAt).getTime() + SESSION_MAX_AGE * 1000;
  return new Date(Math.min(byLogin, new Date(session.expiresAt).getTime()));
}
