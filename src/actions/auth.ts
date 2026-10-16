"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import { createSession, destroySession, getCurrentUser, homeFor, requireUser, setActiveRole } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema, fieldErrors, loginSchema, type FormState } from "@/lib/validation";

const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
// Mavjud bo'lmagan login uchun ham bir xil vaqt sarflash (foydalanuvchilarni aniqlashning oldini olish)
const DUMMY_HASH = "$2b$12$MyICijd/656fvs1jImXUEO1QH0N7gXAYXFgxYi.UCVn33eA.reuvS";

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { login, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { login: login.toLowerCase() } });
  const generic = "Login yoki parol noto'g'ri";

  if (!user) {
    await verifyPassword(password, DUMMY_HASH);
    return { message: generic };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { message: "Juda ko'p muvaffaqiyatsiz urinish. Iltimos, 15 daqiqadan so'ng qayta urinib ko'ring." };
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    const failed = user.failedLogins + 1;
    await prisma.user.update({
      where: { id: user.id },
      data:
        failed >= MAX_FAILED
          ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) }
          : { failedLogins: failed },
    });
    return { message: generic };
  }
  if (!user.isActive) {
    return { message: "Hisobingiz faol emas. Administrator bilan bog'laning." };
  }
  if (!user.roles.includes("ADMIN") && user.role !== "ADMIN" && !user.universityId) {
    return { message: "Hisobingiz universitetga biriktirilmagan. Administrator bilan bog'laning." };
  }
  if (!user.roles.includes("ADMIN") && user.universityId) {
    const uni = await prisma.university.findUnique({ where: { id: user.universityId }, select: { isActive: true } });
    if (uni && !uni.isActive) return { message: "Universitetingiz hozircha faol emas. Administrator bilan bog'laning." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
  await createSession(user.id);
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
  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false },
  });
  if (me.mustChangePassword) redirect(homeFor(me.role));
  return { ok: true, message: "Parol muvaffaqiyatli yangilandi" };
}
