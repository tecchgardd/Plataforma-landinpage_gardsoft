import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

/**
 * Envio de e-mails pelo Resend (https://resend.com) ou por SMTP (ex.: Gmail).
 * Resend: RESEND_API_KEY e MAIL_FROM (remetente de um domínio verificado no Resend).
 * SMTP: SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS. No Gmail, SMTP_PASS é uma "senha de app".
 * MAIL_FROM: remetente, ex.: "Gardsoft <contato@gardsoft.com.br>". No SMTP, sem MAIL_FROM usa o próprio SMTP_USER.
 * EMAIL_PROVIDER ("resend" ou "smtp") escolhe o serviço quando os dois estão configurados; sem ele, o SMTP tem preferência.
 */

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function resendConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

function activeProvider(): "smtp" | "resend" | null {
  const preferred = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (preferred === "resend" && resendConfigured()) return "resend";
  if (preferred === "smtp" && smtpConfigured()) return "smtp";
  if (smtpConfigured()) return "smtp";
  return resendConfigured() ? "resend" : null;
}

export function emailConfigured() {
  return activeProvider() !== null;
}

/** Nome do serviço em uso, para as telas de integração. */
export function emailProvider() {
  const provider = activeProvider();
  if (provider === "smtp") return process.env.SMTP_HOST === "smtp.gmail.com" ? "Gmail (SMTP)" : "SMTP";
  return provider === "resend" ? "Resend" : null;
}

export type Attachment = { filename: string; content: Buffer };
type EmailInput = { to: string; subject: string; html: string; attachments?: Attachment[]; replyTo?: string };

let transport: Transporter | null = null;

function smtp() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

async function sendSmtp(input: EmailInput) {
  const from = process.env.MAIL_FROM || `Gardsoft <${process.env.SMTP_USER}>`;
  try {
    const info = await smtp().sendMail({
      from,
      to: input.to,
      replyTo: input.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments,
    });
    return { id: info.messageId };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "EAUTH") throw new Error("SMTP recusou o login. No Gmail, use uma senha de app (não a senha da conta).");
    throw new Error(`Falha ao enviar e-mail por SMTP: ${(error as Error).message}`);
  }
}

let resendClient: Resend | null = null;

async function sendResend(input: EmailInput) {
  resendClient ??= new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resendClient.emails.send({
    from: process.env.MAIL_FROM!,
    to: [input.to],
    replyTo: input.replyTo || undefined,
    subject: input.subject,
    html: input.html,
    attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
  });
  if (error) {
    // Com o remetente de teste (onboarding@resend.dev), o Resend só entrega para o e-mail da própria conta.
    const hint = /testing emails|verify a domain/i.test(error.message) ? " Verifique um domínio no Resend para enviar a clientes." : "";
    throw new Error(`Resend: ${error.message}${hint}`);
  }
  return { id: data.id };
}

export async function sendEmail(input: EmailInput) {
  const provider = activeProvider();
  if (!provider) throw new Error("Envio de e-mail não configurado: defina RESEND_API_KEY e MAIL_FROM, ou SMTP_HOST/SMTP_USER/SMTP_PASS.");
  return provider === "resend" ? sendResend(input) : sendSmtp(input);
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Layout padrão dos e-mails da Gardsoft (HTML simples, compatível com clientes de e-mail). */
export function emailLayout(input: { title: string; paragraphs: string[]; button?: { label: string; url: string }; footer?: string }) {
  const body = input.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#33405f">${escape(p)}</p>`).join("");
  const button = input.button
    ? `<p style="margin:24px 0"><a href="${escape(input.button.url)}" style="display:inline-block;padding:14px 26px;border-radius:12px;background:#1a5cff;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none">${escape(input.button.label)}</a></p>
       <p style="margin:0 0 14px;font-size:12px;color:#6a7593">Se o botão não funcionar, copie este endereço: ${escape(input.button.url)}</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f7fd;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e3e9f5">
      <tr><td style="background:linear-gradient(100deg,#14c2ff,#1a73ff 45%,#1638f5);background-color:#1a5cff;padding:22px 28px">
        <span style="font-size:20px;font-weight:800;letter-spacing:1px;color:#ffffff">GARD<span style="font-weight:600;color:#cfe6ff">SOFT</span></span>
      </td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:22px;color:#0a1430">${escape(input.title)}</h1>
        ${body}${button}
      </td></tr>
      <tr><td style="padding:18px 28px;border-top:1px solid #e3e9f5;font-size:12px;color:#6a7593">${escape(input.footer ?? "Gardsoft · Tecnologia que impulsiona negócios")}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}
