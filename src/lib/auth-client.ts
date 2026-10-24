"use client";

import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

// No navegador, fala com o próprio endereço aberto. Na renderização do servidor o cliente não faz requisições,
// mas sem baseURL ele leria BETTER_AUTH_URL do ambiente e derrubaria a página se o valor estivesse malformado.
export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "http://localhost" : window.location.origin,
  plugins: [usernameClient()],
});
