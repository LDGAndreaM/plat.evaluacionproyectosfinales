import "server-only";
import nodemailer from "nodemailer";

/** Envía correos con una cuenta de Gmail (contraseña de aplicación). Sin configurar, no envía nada. */
export function mailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

let transport: nodemailer.Transporter | null = null;

export async function sendMail(to: string, msg: { subject: string; html: string; text: string }) {
  if (!mailConfigured()) throw new Error("Correo no configurado");
  transport ??= nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    pool: true,
    maxConnections: 2,
  });
  await transport.sendMail({ from: { name: "EvalúaQR", address: process.env.GMAIL_USER! }, to, ...msg });
}
