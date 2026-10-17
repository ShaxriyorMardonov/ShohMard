"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { completeMfa, createSession, destroySession, getCurrentUser, getPendingMfa, homeFor, requireUser, revokeOtherSessions, setActiveRole } from "@/lib/auth";
import { captchaSiteKey, verifyCaptcha } from "@/lib/captcha";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/recovery-codes";
import { getClientIp } from "@/lib/request-info";
import { verifyTotp } from "@/lib/totp";
import { hashPassword, verifyPassword } from "@/lib/password";
import { audit } from "@/server/audit";
import { loginGate, recordLoginAttempt } from "@/server/rate-limit";
import { LEGACY_DEFAULT_PASSWORD } from "@/server/student-account";
import { changePasswordSchema, fieldErrors, loginSchema, weakPasswordReason, type FormState } from "@/lib/validation";

// Mavjud bo'lmagan login uchun ham bir xil vaqt sarflash (foydalanuvchilarni aniqlashning oldini olish)
const DUMMY_HASH = "$2b$12$MyICijd/656fvs1jImXUEO1QH0N7gXAYXFgxYi.UCVn33eA.reuvS";

const isAdminUser = (u: { role: Role; roles: Role[] }) => u.role === "ADMIN" || u.roles.includes("ADMIN");

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { password } = parsed.data;
  const login = parsed.data.login.toLowerCase();
  const ip = await getClientIp();
  const gate = await loginGate(ip, login);
  if (gate.blocked) return { message: gate.message };
  const captchaOn = !!captchaSiteKey();
  if (gate.captcha && captchaOn && !(await verifyCaptcha(String(formData.get("cf-turnstile-response") ?? "") || null, ip))) {
    return { message: "Iltimos, robot emasligingizni tasdiqlang", captcha: true };
  }

  const user = await prisma.user.findUnique({ where: { login } });
  const generic = "Login yoki parol noto'g'ri";
  const fail = async () => {
    await recordLoginAttempt(ip, login, false);
    const next = await loginGate(ip, login);
    return { message: next.blocked ? next.message : generic, captcha: captchaOn && !next.blocked && next.captcha };
  };

  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return fail();
  }
  if (!(await verifyPassword(password, user.passwordHash))) return fail();
  // Eski umumiy boshlang'ich parol endi qabul qilinmaydi: hamma bilgan parol bilan begona kirishining oldini olish
  if (user.mustChangePassword && password === LEGACY_DEFAULT_PASSWORD) {
    await recordLoginAttempt(ip, login, false);
    return { message: "Boshlang'ich parolingiz eskirgan. Administrator yoki menejerdan yangi boshlang'ich parol oling." };
  }
  if (!user.isActive) {
    return { message: "Hisobingiz faol emas. Administrator bilan bog'laning." };
  }
  if (!isAdminUser(user) && !user.universityId) {
    return { message: "Hisobingiz universitetga biriktirilmagan. Administrator bilan bog'laning." };
  }
  if (!isAdminUser(user) && user.universityId) {
    const uni = await prisma.university.findUnique({ where: { id: user.universityId }, select: { isActive: true } });
    if (uni && !uni.isActive) return { message: "Universitetingiz hozircha faol emas. Administrator bilan bog'laning." };
  }

  await recordLoginAttempt(ip, login, true);
  // Super admin: paroldan keyin ikki bosqichli tasdiq majburiy
  if (isAdminUser(user)) {
    await createSession(user.id, { mfaPending: true });
    redirect("/login/2fa");
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  if (user.roles.includes("MANAGER")) await audit("login", null, null, { id: user.id, fullName: user.fullName, login: user.login });
  redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
}

const MFA_FAIL_LIMIT = 5;

async function finishMfa(sessionId: string, user: { id: string; fullName: string; login: string; mustChangePassword: boolean; role: Role }, how: string) {
  await completeMfa(sessionId);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await audit("login", null, how, { id: user.id, fullName: user.fullName, login: user.login });
}

async function mfaFailed(userId: string, sessionId: string): Promise<FormState> {
  const ip = await getClientIp();
  await recordLoginAttempt(ip, `mfa:${userId}`, false);
  const fails = await prisma.loginAttempt.count({ where: { login: `mfa:${userId}`, success: false, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } });
  if (fails >= MFA_FAIL_LIMIT) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    return { message: "Juda ko'p noto'g'ri kod. Qaytadan tizimga kiring." };
  }
  return { errors: { code: "Kod noto'g'ri yoki eskirgan" } };
}

/** Kirishda ikki bosqichli tasdiq: ilovadagi 6 xonali kod yoki zaxira kod. */
export async function verifyMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  const { user } = pending;
  if (!user.totpSecret || !user.totpEnabledAt) redirect("/login/2fa");
  const raw = String(formData.get("code") ?? "").trim();
  if (!raw) return { errors: { code: "Kodni kiriting" } };
  const step = verifyTotp(user.totpSecret, raw, user.totpLastStep);
  if (step !== null) {
    await prisma.user.update({ where: { id: user.id }, data: { totpLastStep: step } });
    await finishMfa(pending.id, user, "2FA");
  } else {
    const h = hashRecoveryCode(raw);
    if (!user.recoveryCodes.includes(h)) return mfaFailed(user.id, pending.id);
    await prisma.user.update({ where: { id: user.id }, data: { recoveryCodes: user.recoveryCodes.filter((c) => c !== h) } });
    await finishMfa(pending.id, user, "zaxira kod");
  }
  redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
}

/** Birinchi marta: autentifikator ilovasini ulash. Kod to'g'ri bo'lsa, zaxira kodlar bir marta ko'rsatiladi. */
export async function setupMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  const { user } = pending;
  if (user.totpEnabledAt) redirect("/login/2fa");
  if (!user.totpSecret) return { message: "Sahifani yangilang" };
  const step = verifyTotp(user.totpSecret, String(formData.get("code") ?? ""), null);
  if (step === null) return mfaFailed(user.id, pending.id);
  const codes = generateRecoveryCodes();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpEnabledAt: new Date(), totpLastStep: step, recoveryCodes: codes.map(hashRecoveryCode) },
  });
  await finishMfa(pending.id, user, "2FA yoqildi");
  await audit("mfa.enable", user.fullName, null, { id: user.id, fullName: user.fullName, login: user.login });
  return { ok: true, recoveryCodes: codes };
}

/** Bir nechta roli bo'lgan foydalanuvchi faol rolni almashtiradi. */
export async function switchRoleAction(role: Role) {
  const me = await requireUser();
  if (!me.roles.includes(role)) return;
  if (role !== "ADMIN" && !me.university) return;
  await setActiveRole(role);
  redirect(homeFor(role));
}

export async function logoutAction() {
  await destroySession();
  // Tasdiqlanmagan (2FA kutilayotgan) sessiya ham shu yerda yopiladi
  redirect("/login");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  const parsed = changePasswordSchema.safeParse({
    // Birinchi kirishda joriy parol so'ralmaydi: foydalanuvchi hozirgina u bilan kirdi
    currentPassword: me.mustChangePassword ? "-" : formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!me.mustChangePassword && !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { errors: { currentPassword: "Joriy parol noto'g'ri" } };
  }
  if (await verifyPassword(parsed.data.newPassword, user.passwordHash)) {
    return { errors: { newPassword: "Yangi parol eskisidan farq qilishi kerak" } };
  }
  const weak = weakPasswordReason(parsed.data.newPassword, user.login);
  if (weak) return { errors: { newPassword: weak } };
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false, passwordChangedAt: new Date() },
  });
  // Parol almashdi: boshqa qurilmalardagi barcha sessiyalar yopiladi
  await revokeOtherSessions(me.id, me.sessionId);
  await audit("password.change", me.fullName);
  if (me.mustChangePassword) redirect(homeFor(me.role));
  return { ok: true, message: "Parol muvaffaqiyatli yangilandi" };
}

/** Joriy qurilmadan boshqa barcha qurilmalardagi sessiyalarni yopadi. */
export async function logoutOtherSessionsAction(): Promise<void> {
  const me = await requireUser();
  await revokeOtherSessions(me.id, me.sessionId);
  await audit("session.revoke_others", me.fullName);
  revalidatePath("/admin/settings");
}

/** Yangi zaxira kodlar (eskilari bekor bo'ladi). Ilovadagi joriy kod bilan tasdiqlanadi. */
export async function regenerateRecoveryCodesAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { totpSecret: true, totpEnabledAt: true, totpLastStep: true } });
  if (!user.totpSecret || !user.totpEnabledAt) return { message: "Ikki bosqichli tasdiq yoqilmagan" };
  const step = verifyTotp(user.totpSecret, String(formData.get("code") ?? ""), user.totpLastStep);
  if (step === null) return { errors: { code: "Kod noto'g'ri yoki eskirgan" } };
  const codes = generateRecoveryCodes();
  await prisma.user.update({ where: { id: me.id }, data: { totpLastStep: step, recoveryCodes: codes.map(hashRecoveryCode) } });
  await audit("mfa.recovery_codes", me.fullName);
  return { ok: true, recoveryCodes: codes };
}
