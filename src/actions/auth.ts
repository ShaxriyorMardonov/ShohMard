"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { createSession, destroySession, getCurrentUser, homeFor, requireUser, revokeOtherSessions, setActiveRole } from "@/lib/auth";
import { captchaSiteKey, verifyCaptcha } from "@/lib/captcha";
import { getClientIp } from "@/lib/request-info";
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
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession(user.id);
  if (isAdminUser(user) || user.roles.includes("MANAGER")) await audit("login", null, null, { id: user.id, fullName: user.fullName, login: user.login });
  redirect(user.mustChangePassword ? "/change-password" : homeFor(user.role));
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
