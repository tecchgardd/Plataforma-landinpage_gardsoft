import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

/**
 * Envio de e-mails por SMTP (ex.: Gmail) ou pelo Resend (https://resend.com). Com SMTP configurado, ele tem preferência.
 * SMTP: SMTP_HOST, SMTP_PORT (465 = SSL, 587 = STARTTLS), SMTP_USER, SMTP_PASS. No Gmail, SMTP_PASS é uma "senha de app".
 * Resend: RESEND_API_KEY e MAIL_FROM (domínio verificado no Resend).
 * MAIL_FROM: remetente, ex.: "Gardsoft <contato@gardsoft.com.br>". No SMTP, sem MAIL_FROM usa o próprio SMTP_USER.
 */

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function emailConfigured() {
  return smtpConfigured() || Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

/** Nome do serviço em uso, para as telas de integração. */
export function emailProvider() {
  if (smtpConfigured()) return process.env.SMTP_HOST === "smtp.gmail.com" ? "Gmail (SMTP)" : "SMTP";
  return process.env.RESEND_API_KEY ? "Resend" : null;
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

async function sendResend(input: EmailInput) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [input.to],
      reply_to: input.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message ?? `Falha ao enviar e-mail (${res.status}).`);
  }
  return (await res.json()) as { id: string };
}

export async function sendEmail(input: EmailInput) {
  if (!emailConfigured()) throw new Error("Envio de e-mail não configurado: defina SMTP_HOST/SMTP_USER/SMTP_PASS ou RESEND_API_KEY e MAIL_FROM.");
  return smtpConfigured() ? sendSmtp(input) : sendResend(input);
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
