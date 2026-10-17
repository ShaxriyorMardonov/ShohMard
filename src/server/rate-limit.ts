import "server-only";
import { prisma } from "@/lib/db";

const MIN = 60 * 1000;
/** Bitta IP'dan 15 daqiqada shuncha xato kirishdan keyin IP vaqtincha bloklanadi. */
export const IP_FAIL_LIMIT = 20;
/** Bitta IP'dan bitta login uchun 15 daqiqadagi xatolar chegarasi (boshqa IP'lardagi egasi bloklanmaydi). */
export const PAIR_FAIL_LIMIT = 5;
/** Bitta login uchun barcha IP'lardan 1 soatdagi xatolar chegarasi (taqsimlangan hujumga qarshi). */
export const LOGIN_FAIL_LIMIT = 50;
/** Shuncha xatodan keyin (CAPTCHA sozlangan bo'lsa) CAPTCHA so'raladi. */
export const CAPTCHA_AFTER = 3;

export type LoginGate = { blocked: true; message: string } | { blocked: false; captcha: boolean };

export async function loginGate(ip: string, login: string): Promise<LoginGate> {
  const since15 = new Date(Date.now() - 15 * MIN);
  const since60 = new Date(Date.now() - 60 * MIN);
  const [ipFails, pairFails, loginFails] = await Promise.all([
    prisma.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since15 } } }),
    prisma.loginAttempt.count({ where: { ip, login, success: false, createdAt: { gte: since15 } } }),
    prisma.loginAttempt.count({ where: { login, success: false, createdAt: { gte: since60 } } }),
  ]);
  if (ipFails >= IP_FAIL_LIMIT || pairFails >= PAIR_FAIL_LIMIT) {
    return { blocked: true, message: "Juda ko'p muvaffaqiyatsiz urinish. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring." };
  }
  if (loginFails >= LOGIN_FAIL_LIMIT) {
    return { blocked: true, message: "Bu hisobga juda ko'p urinish bo'ldi. Iltimos, keyinroq urinib ko'ring yoki administratorga murojaat qiling." };
  }
  return { blocked: false, captcha: ipFails >= CAPTCHA_AFTER };
}

export async function recordLoginAttempt(ip: string, login: string, success: boolean) {
  await prisma.loginAttempt.create({ data: { ip, login, success } });
  // Eski yozuvlarni vaqti-vaqti bilan tozalash
  if (Math.random() < 0.02) {
    await prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * MIN) } } });
  }
}
