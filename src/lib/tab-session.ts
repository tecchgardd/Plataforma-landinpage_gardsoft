/**
 * Marca "esta aba entrou no portal", guardada no sessionStorage: sobrevive ao recarregar a página,
 * mas some quando a aba ou o navegador é fechado. Sem a marca, o portal encerra a sessão (SessionGuard).
 */
export const TAB_SESSION_KEY = "adm-tab";

/** Canal entre as abas do portal: uma aba nova pergunta se há outra aberta antes de encerrar a sessão. */
export const TAB_SESSION_CHANNEL = "adm-session";

/** Esconde a página antes de pintar quando a aba não tem a marca (roda inline, antes do React). */
export const TAB_SESSION_HIDE_SCRIPT = `try{if(!sessionStorage.getItem("${TAB_SESSION_KEY}"))document.documentElement.style.visibility="hidden"}catch(e){}`;

export function markTabSession() {
  try {
    sessionStorage.setItem(TAB_SESSION_KEY, "1");
  } catch {}
}

/** Sem acesso ao sessionStorage (bloqueado pelo navegador), não dá para saber: considera a aba marcada. */
export function hasTabSession() {
  try {
    return sessionStorage.getItem(TAB_SESSION_KEY) === "1";
  } catch {
    return true;
  }
}
