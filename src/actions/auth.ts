"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { completeMfa, createSession, destroySession, getCurrentUser, getPendingMfa, homeFor, requireUser, revokeOtherSessions, setActiveRole } from "@/lib/auth";
import { captchaSiteKey, verifyCaptcha } from "@/lib/captcha";
import { getClientIp } from "@/lib/request-info";
import { hashPassword, verifyPassword } from "@/lib/password";
import { audit } from "@/server/audit";
import { EMAIL_RE, emailTwoFactorRequired, issueEmailCode, maskEmail, verifyEmailCode } from "@/server/email-code";
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
  // Super admin: paroldan keyin emailga yuborilgan kod bilan tasdiqlash majburiy
  if (isAdminUser(user) && emailTwoFactorRequired()) {
    const sessionId = await createSession(user.id, { mfaPending: true });
    if (user.email && user.emailVerifiedAt) {
      const err = await issueEmailCode(user.id, "login", user.email, sessionId);
      if (err) {
        // Xat ketmasa kirish yopiq qoladi
        await prisma.session.deleteMany({ where: { id: sessionId } });
        return { message: err };
      }
    }
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

async function codeFailed(userId: string, sessionId: string, error: string): Promise<FormState> {
  const ip = await getClientIp();
  await recordLoginAttempt(ip, `mfa:${userId}`, false);
  const fails = await prisma.loginAttempt.count({ where: { login: `mfa:${userId}`, success: false, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } } });
  if (fails >= MFA_FAIL_LIMIT) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
    return { message: "Juda ko'p noto'g'ri kod. Qaytadan tizimga kiring." };
  }
  return { errors: { code: error } };
}

/** Kirishda ikkinchi bosqich: Super admin emailiga yuborilgan 6 xonali kod. */
export async function verifyMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  const { user } = pending;
  if (!user.email || !user.emailVerifiedAt) redirect("/login/2fa");
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { errors: { code: "Kodni kiriting" } };
  const res = await verifyEmailCode(user.id, "login", code, pending.id);
  if (!res.ok) return codeFailed(user.id, pending.id, res.error);
  await finishMfa(pending.id, user, "email kod");
  redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
}

/** Kirish kodini qayta yuborish. */
export async function resendMfaCodeAction(): Promise<FormState> {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  const { user } = pending;
  if (!user.email || !user.emailVerifiedAt) redirect("/login/2fa");
  const err = await issueEmailCode(user.id, "login", user.email, pending.id);
  return err ? { message: err } : { ok: true, sentTo: maskEmail(user.email) };
}

async function checkNewEmail(raw: FormDataEntryValue | null, userId: string): Promise<{ email: string } | { error: string }> {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 120) return { error: "Email manzilini to'g'ri kiriting" };
  const taken = await prisma.user.findFirst({ where: { email, NOT: { id: userId } }, select: { id: true } });
  if (taken) return { error: "Bu email boshqa hisobga biriktirilgan" };
  return { email };
}

/** Birinchi kirishda: Super admin Gmail manzilini kiritadi, unga tasdiqlash kodi yuboriladi. */
export async function startMfaEmailSetupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  if (pending.user.emailVerifiedAt) redirect("/login/2fa");
  const r = await checkNewEmail(formData.get("email"), pending.user.id);
  if ("error" in r) return { errors: { email: r.error } };
  const err = await issueEmailCode(pending.user.id, "verify_email", r.email, pending.id);
  return err ? { message: err } : { ok: true, sentTo: maskEmail(r.email) };
}

/** Birinchi kirishda: emailga kelgan kod to'g'ri bo'lsa, email tasdiqlanadi va kirish yakunlanadi. */
export async function confirmMfaEmailSetupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  const { user } = pending;
  if (user.emailVerifiedAt) redirect("/login/2fa");
  const res = await verifyEmailCode(user.id, "verify_email", String(formData.get("code") ?? ""), pending.id);
  if (!res.ok) return codeFailed(user.id, pending.id, res.error);
  const saved = await saveVerifiedEmail(user.id, res.email);
  if (!saved) return { message: "Bu email boshqa hisobga biriktirilgan" };
  await finishMfa(pending.id, user, "email tasdiqlandi");
  await audit("email.verify", user.fullName, maskEmail(res.email), { id: user.id, fullName: user.fullName, login: user.login });
  redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
}

async function saveVerifiedEmail(userId: string, email: string) {
  try {
    await prisma.user.update({ where: { id: userId }, data: { email, emailVerifiedAt: new Date() } });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return false;
    throw e;
  }
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

/** Sozlamalar: yangi email manziliga tasdiqlash kodi yuborish (joriy parol bilan). */
export async function startEmailChangeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  if (!me.roles.includes("ADMIN")) return { message: "Ruxsat yo'q" };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(String(formData.get("password") ?? ""), user.passwordHash))) {
    return { errors: { password: "Joriy parol noto'g'ri" } };
  }
  const r = await checkNewEmail(formData.get("email"), me.id);
  if ("error" in r) return { errors: { email: r.error } };
  const err = await issueEmailCode(me.id, "verify_email", r.email, me.sessionId);
  return err ? { message: err } : { ok: true, sentTo: maskEmail(r.email) };
}

/** Sozlamalar: kod to'g'ri bo'lsa, yangi email saqlanadi. */
export async function confirmEmailChangeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser();
  if (!me.roles.includes("ADMIN")) return { message: "Ruxsat yo'q" };
  const res = await verifyEmailCode(me.id, "verify_email", String(formData.get("code") ?? ""), me.sessionId);
  if (!res.ok) return { errors: { code: res.error } };
  if (!(await saveVerifiedEmail(me.id, res.email))) return { message: "Bu email boshqa hisobga biriktirilgan" };
  await audit("email.verify", me.fullName, maskEmail(res.email));
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Email tasdiqlandi. Endi tizimga kirishda shu manzilga kod yuboriladi." };
}
