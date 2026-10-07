import nodemailer from "nodemailer";
/** Sends mail via SMTP_URL (e.g. smtps://user:pass@smtp.gmail.com:465). SMTP_URL=json keeps messages in memory (tests). No SMTP_URL => logs to the server console only. */
const g = globalThis as unknown as { __outbox?: any[] };
export async function sendMail(to: string, subject: string, text: string): Promise<{ sent: boolean; reason?: string }> {
  const url = process.env.SMTP_URL; const from = process.env.MAIL_FROM || "DateFlow <no-reply@dateflow.local>";
  if (!url) { console.log(`[DateFlow mail → ${to}] ${subject}\n${text}`); return { sent: false, reason: "SMTP_URL not configured" }; }
  try {
    const tr = url === "json" ? nodemailer.createTransport({ jsonTransport: true }) : nodemailer.createTransport(url);
    const info: any = await tr.sendMail({ from, to, subject, text });
    if (url === "json") (g.__outbox ??= []).push(JSON.parse(info.message)); return { sent: true };
  } catch (e: any) { console.error("[DateFlow mail] failed:", e.message); return { sent: false, reason: e.message }; }
}
export const outbox = () => g.__outbox ?? [];
