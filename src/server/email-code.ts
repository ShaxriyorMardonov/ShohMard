import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getT } from "@/i18n/server";
import { prisma } from "@/lib/db";
import { isMailConfigured, sendMail } from "./mailer";

export type CodePurpose = "login" | "verify_email";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_SENDS_PER_15_MIN = 5;
const MAX_ATTEMPTS = 5;

const hash = (code: string) => createHash("sha256").update(code).digest("hex");

/**
 * Super admin kirishida email orqali ikkinchi bosqich majburiymi.
 * Xat yuborish sozlanmagan bo'lsa yoki ADMIN_EMAIL_2FA=off bo'lsa (favqulodda holat), faqat parol bilan kiriladi.
 */
export function emailTwoFactorRequired() {
  return isMailConfigured() && process.env.ADMIN_EMAIL_2FA !== "off";
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Emailni qisman yashirish: sh****r44@gmail.com */
export function maskEmail(email: string) {
  const [name = "", domain = ""] = email.split("@");
  const keep = name.length <= 3 ? 1 : 2;
  return `${name.slice(0, keep)}${"*".repeat(Math.max(2, name.length - keep - 1))}${name.slice(-1)}@${domain}`;
}

/**
 * 6 xonali kod yaratib, emailga yuboradi.
 * Qaytaradi: null — yuborildi, aks holda xato matni (tarjima kaliti).
 */
export async function issueEmailCode(userId: string, purpose: CodePurpose, email: string, sessionId?: string): Promise<string | null> {
  if (!isMailConfigured()) return "Xat yuborish sozlanmagan. Administrator SMTP sozlamalarini kiritishi kerak.";
  const recent = await prisma.emailCode.findMany({
    where: { userId, purpose, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_AFTER_MS) return "Kod yaqinda yuborildi. Bir daqiqadan so'ng qayta so'rang.";
  if (recent.length >= MAX_SENDS_PER_15_MIN) return "Juda ko'p kod so'raldi. 15 daqiqadan so'ng qayta urinib ko'ring.";

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  // Avvalgi ishlatilmagan kodlar bekor qilinadi
  await prisma.emailCode.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.emailCode.create({
    data: { userId, purpose, email, sessionId: sessionId ?? null, codeHash: hash(code), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
  });

  const { t } = await getT();
  const subject = purpose === "login" ? t("SAMU: kirish kodi {code}", { code }) : t("SAMU: email tasdiqlash kodi {code}", { code });
  const lead = purpose === "login" ? t("SAMU platformasiga Super admin sifatida kirish uchun tasdiqlash kodi:") : t("Email manzilingizni tasdiqlash kodi:");
  const note = t("Kod 10 daqiqa amal qiladi. Agar bu siz bo'lmasangiz, darhol parolingizni almashtiring va hech kimga kodni aytmang.");
  const text = `${lead}\n\n${code}\n\n${note}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#101d3a">
  <p style="font-size:20px;font-weight:800;letter-spacing:3px;color:#315ECA;margin:0 0 16px">SAMU</p>
  <p style="font-size:15px;margin:0 0 12px">${lead}</p>
  <p style="font-size:34px;font-weight:800;letter-spacing:8px;margin:0 0 16px;font-family:monospace">${code}</p>
  <p style="font-size:13px;color:#5b6478;margin:0">${note}</p>
</div>`;
  const sent = await sendMail(email, subject, text, html);
  return sent ? null : "Xat yuborib bo'lmadi. Birozdan so'ng qayta urinib ko'ring.";
}

export type VerifyResult = { ok: true; email: string } | { ok: false; error: string; exhausted?: boolean };

/** Kodni tekshiradi. To'g'ri bo'lsa, kod ishlatilgan deb belgilanadi. */
export async function verifyEmailCode(userId: string, purpose: CodePurpose, code: string, sessionId?: string): Promise<VerifyResult> {
  const c = code.replace(/\s/g, "");
  const row = await prisma.emailCode.findFirst({
    where: { userId, purpose, usedAt: null, ...(sessionId ? { sessionId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt < new Date()) return { ok: false, error: "Kod eskirgan. Yangi kod so'rang." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Juda ko'p noto'g'ri kod. Yangi kod so'rang.", exhausted: true };
  const ok = /^\d{6}$/.test(c) && timingSafeEqual(Buffer.from(hash(c)), Buffer.from(row.codeHash));
  if (!ok) {
    const attempts = row.attempts + 1;
    await prisma.emailCode.update({ where: { id: row.id }, data: { attempts } });
    return attempts >= MAX_ATTEMPTS
      ? { ok: false, error: "Juda ko'p noto'g'ri kod. Yangi kod so'rang.", exhausted: true }
      : { ok: false, error: "Kod noto'g'ri" };
  }
  await prisma.emailCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return { ok: true, email: row.email };
}
