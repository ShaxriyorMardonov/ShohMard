"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, getCurrentUser, homeFor, requireUser } from "@/lib/auth";
import { captchaSiteKey, verifyCaptcha } from "@/lib/captcha";
import { prisma } from "@/lib/db";
import { isOlympiad } from "@/lib/olympiad";
import { hashPassword } from "@/lib/password";
import { getClientIp } from "@/lib/request-info";
import { fieldErrors, passwordSchema, weakPasswordReason, type FormState } from "@/lib/validation";
import { audit } from "@/server/audit";
import { recordLoginAttempt } from "@/server/rate-limit";
import { verifyUniversity } from "@/server/university-search";

/** Bitta IP manzildan bir soatda shuncha ro'yxatdan o'tish mumkin (bot va spamga qarshi). */
const REGISTER_PER_HOUR = 5;
const REGISTER_MARK = "register";

const registerSchema = z
  .object({
    fullName: z.string().trim().min(5, "Familiya, ism va otasining ismini to'liq kiriting").max(120, "Juda uzun"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{9,20}$/, "Telefon raqamini to'g'ri kiriting, masalan +998 90 123 45 67"),
    /** Qidiruvdan tanlangan universitet kaliti (g:… yoki l:…) */
    orgRef: z.string().trim().max(400),
    /** "Ro'yxatda topilmadi" belgilanganda qo'lda yozilgan nom */
    orgManual: z.boolean(),
    organization: z.string().trim().max(160, "Juda uzun"),
    login: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._]{4,32}$/, "Login 4–32 ta lotin harfi, raqam, nuqta yoki pastki chiziqdan iborat bo'lsin")
      .refine((v) => /[a-z]/.test(v), "Loginda kamida bitta harf bo'lsin"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Parollar mos kelmadi" });

/** Olimpiadaga tashqi ishtirokchini ro'yxatdan o'tkazadi va darhol tizimga kiritadi. */
export async function registerParticipantAction(_prev: FormState, fd: FormData): Promise<FormState> {
  if (await getCurrentUser()) redirect("/olympiad");
  const parsed = registerSchema.safeParse({
    fullName: fd.get("fullName") ?? "",
    phone: fd.get("phone") ?? "",
    orgRef: fd.get("orgRef") ?? "",
    orgManual: fd.get("orgManual") === "1",
    organization: fd.get("organization") ?? "",
    login: fd.get("login") ?? "",
    password: fd.get("password") ?? "",
    confirmPassword: fd.get("confirmPassword") ?? "",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const weak = weakPasswordReason(d.password, d.login);
  if (weak) return { errors: { password: weak } };

  const ip = await getClientIp();
  const recent = await prisma.loginAttempt.count({
    where: { ip, login: REGISTER_MARK, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (recent >= REGISTER_PER_HOUR) return { message: "Bu qurilmadan juda ko'p ro'yxatdan o'tildi. Birozdan so'ng qayta urinib ko'ring." };
  if (captchaSiteKey() && !(await verifyCaptcha(String(fd.get("cf-turnstile-response") ?? "") || null, ip))) {
    return { message: "Iltimos, robot emasligingizni tasdiqlang" };
  }

  // Universitet: ro'yxatdan tanlangan bo'lsa serverda qayta tasdiqlanadi, aks holda qo'lda yozilgan (tasdiqlanmagan)
  let org: { name: string; country: string | null; verified: boolean };
  if (d.orgManual) {
    if (d.organization.length < 2) return { errors: { organization: "Universitet nomini to'liq kiriting" } };
    org = { name: d.organization.replace(/\s+/g, " "), country: null, verified: false };
  } else {
    const v = d.orgRef ? await verifyUniversity(d.orgRef) : null;
    if (!v) return { errors: { organization: "Universitetni qidiruv natijalaridan tanlang" } };
    org = { ...v, verified: true };
  }

  if (await prisma.user.findUnique({ where: { login: d.login }, select: { id: true } })) {
    return { errors: { login: "Bu login band. Boshqasini tanlang." } };
  }
  let userId: string;
  try {
    const u = await prisma.user.create({
      data: {
        login: d.login,
        fullName: d.fullName.replace(/\s+/g, " "),
        phone: d.phone.replace(/\s+/g, " "),
        organization: org.name,
        organizationVerified: org.verified,
        organizationCountry: org.country,
        passwordHash: await hashPassword(d.password),
        passwordChangedAt: new Date(),
        role: "PARTICIPANT",
        roles: ["PARTICIPANT"],
      },
      select: { id: true, fullName: true, login: true },
    });
    userId = u.id;
    await audit("participant.register", `${u.fullName} (${u.login})`, org.name, u);
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { errors: { login: "Bu login band. Boshqasini tanlang." } };
    throw e;
  }
  await recordLoginAttempt(ip, REGISTER_MARK, true);
  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  await createSession(userId);
  redirect(homeFor("PARTICIPANT"));
}

/** Olimpiada diplomidagi ilmiy rahbarni saqlaydi (faqat urinish egasi). Bo'sh qiymat — o'chiriladi. */
export async function saveSupervisorAction(attemptId: string, value: string): Promise<{ error?: string; ok?: true }> {
  const user = await requireUser();
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  if (name.length > 120) return { error: "Juda uzun" };
  if (name && name.length < 5) return { error: "Ilmiy rahbarning familiyasi, ismi va otasining ismini to'liq kiriting" };
  const a = await prisma.attempt.findUnique({ where: { id: String(attemptId) }, select: { userId: true, test: { select: { kind: true } } } });
  if (!a || a.userId !== user.id || !isOlympiad(a.test.kind)) return { error: "Ruxsat yo'q" };
  await prisma.attempt.update({ where: { id: String(attemptId) }, data: { supervisor: name || null } });
  revalidatePath(`/certificate/${attemptId}`);
  return { ok: true };
}
