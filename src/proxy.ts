import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { contentSecurityPolicy } from "./lib/csp";

/**
 * Portal e páginas por link (contrato, orçamento, documento):
 * 1. Checagem otimista do portal: sem cookie de sessão, manda para o login.
 *    A validação real da sessão acontece no servidor (requireUser / requireAccess).
 * 2. CSP estrita com nonce novo a cada requisição. O Next lê o nonce do cabeçalho da requisição
 *    e o aplica nos próprios scripts; essas páginas já são dinâmicas, então sempre recebem o nonce.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPanel = pathname.startsWith("/admin") && pathname !== "/admin/login";
  if (isPanel && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  // Páginas com dados de clientes: fora dos buscadores.
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/contrato/:path*", "/orcamento/:path*", "/documento/:path*"],
};
