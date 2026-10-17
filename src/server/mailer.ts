import "server-only";
import nodemailer from "nodemailer";

/**
 * Xat yuborish Gmail (yoki boshqa SMTP) orqali.
 * Sozlash: SMTP_USER — Gmail manzili, SMTP_PASS — Google "App password" (16 belgili ilova paroli).
 * Boshqa pochta xizmati uchun SMTP_HOST va SMTP_PORT ham beriladi.
 */
export function isMailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT || 465);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS?.replace(/\s/g, "") },
    });
  }
  return transport;
}

export async function sendMail(to: string, subject: string, text: string, html: string): Promise<boolean> {
  if (!isMailConfigured()) return false;
  try {
    await getTransport().sendMail({ from: `"SAMU" <${process.env.SMTP_USER}>`, to, subject, text, html });
    return true;
  } catch (e) {
    console.error("mail send failed", e);
    return false;
  }
}
