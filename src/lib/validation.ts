import { z } from "zod";

// Xabar statik bo'lishi kerak (UI'da tarjima kaliti sifatida ishlatiladi)
const trimmed = (max: number) => z.string().trim().max(max, "Matn juda uzun");

export const loginSchema = z.object({
  login: z.string().trim().min(1, "Login kiriting").max(64, "Login juda uzun"),
  password: z.string().min(1, "Parol kiriting").max(128, "Parol juda uzun"),
});

export const passwordSchema = z
  .string()
  .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
  .max(128, "Parol juda uzun")
  .regex(/[A-Za-z]/, "Parolda kamida bitta harf bo'lishi kerak")
  .regex(/\d/, "Parolda kamida bitta raqam bo'lishi kerak");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Joriy parolni kiriting"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Parollar mos kelmadi",
  });

export const universitySchema = z.object({
  name: trimmed(160).min(3, "Universitet nomini kiriting"),
  shortName: trimmed(20).min(2, "Qisqa nomni kiriting"),
  city: trimmed(80).optional().transform((v) => v || null),
});

export const loginField = z
  .string()
  .trim()
  .min(3, "Login kamida 3 ta belgidan iborat bo'lsin")
  .max(64, "Login juda uzun")
  .regex(/^[a-zA-Z0-9._-]+$/, "Loginda faqat lotin harflari, raqamlar va . _ - belgilari bo'lishi mumkin")
  .transform((v) => v.toLowerCase());

/** JShShIR — 14 ta raqam. */
export const pinflField = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().min(1, "JShShIR ni kiriting").regex(/^\d{14}$/, "JShShIR 14 ta raqamdan iborat bo'lishi kerak"));

export const studentSchema = z.object({
  fullName: trimmed(120).min(3, "F.I.Sh. ni kiriting"),
  pinfl: pinflField,
  universityId: z.string().min(1, "Universitetni tanlang"),
  facultyName: trimmed(120).optional().transform((v) => v || null),
  groupName: trimmed(40).optional().transform((v) => v || null),
  studyForm: z
    .enum(["", "KUNDUZGI", "SIRTQI", "KECHKI", "MASOFAVIY"], { error: "Ta'lim shakli noto'g'ri" })
    .optional()
    .transform((v) => v || null),
  isActive: z.boolean(),
});

export const staffSchema = z
  .object({
    fullName: trimmed(120).min(3, "F.I.Sh. ni kiriting"),
    login: loginField,
    roles: z.array(z.enum(["ADMIN", "MANAGER", "STUDENT"])).min(1, "Kamida bitta rolni belgilang"),
    universityId: z.string().optional().transform((v) => v || null),
    isActive: z.boolean(),
  })
  .refine((u) => !(u.roles.includes("MANAGER") || u.roles.includes("STUDENT")) || u.universityId, {
    path: ["universityId"],
    message: "Menejer va talaba roli uchun universitetni tanlang",
  });

export const nameSchema = (label: string, max = 120) => trimmed(max).min(1, `${label} nomini kiriting`);

export const questionSchema = z
  .object({
    text: trimmed(4000).min(3, "Savol matnini kiriting"),
    type: z.enum(["SINGLE", "MULTIPLE", "TRUE_FALSE"], { error: "Savol turini tanlang" }),
    subject: trimmed(80).optional().transform((v) => v || null),
    explanation: trimmed(2000).optional().transform((v) => v || null),
    options: z
      .array(z.object({ text: trimmed(1000).min(1, "Variant matni bo'sh bo'lmasin"), isCorrect: z.boolean() }))
      .min(2, "Kamida 2 ta variant kerak")
      .max(10, "Ko'pi bilan 10 ta variant"),
  })
  .superRefine((q, ctx) => {
    const correct = q.options.filter((o) => o.isCorrect).length;
    if (correct === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "Kamida bitta to'g'ri javobni belgilang" });
    if ((q.type === "SINGLE" || q.type === "TRUE_FALSE") && correct > 1)
      ctx.addIssue({ code: "custom", path: ["options"], message: "Bu turdagi savolda faqat bitta to'g'ri javob bo'ladi" });
    if (q.type === "TRUE_FALSE" && q.options.length !== 2)
      ctx.addIssue({ code: "custom", path: ["options"], message: "To'g'ri/Noto'g'ri savolida aynan 2 ta variant bo'ladi" });
  });

export const testSchema = z
  .object({
    title: trimmed(160).min(3, "Test nomini kiriting"),
    description: trimmed(2000).optional().transform((v) => v || null),
    subject: trimmed(80).optional().transform((v) => v || null),
    durationMinutes: z.coerce.number({ error: "Son kiriting" }).int("Butun son kiriting").min(1, "Kamida 1 daqiqa").max(600, "Ko'pi bilan 600 daqiqa"),
    startsAt: z.date({ message: "Boshlanish vaqtini kiriting" }),
    endsAt: z.date({ message: "Tugash vaqtini kiriting" }),
    passingPercent: z.coerce
      .number({ error: "Son kiriting" })
      .int("Butun son kiriting")
      .min(0, "0 dan 100 gacha kiriting")
      .max(100, "0 dan 100 gacha kiriting"),
    questionsPerAttempt: z
      .union([z.literal(""), z.coerce.number({ error: "Son kiriting" }).int("Butun son kiriting").min(1, "Kamida 1 ta savol").max(1000, "Ko'pi bilan 1000 ta")], { error: "Butun son kiriting" })
      .transform((v) => (v === "" ? null : v)),
    maxScore: z
      .union([z.literal(""), z.coerce.number({ error: "Son kiriting" }).int("Butun son kiriting").min(1, "Kamida 1 ball").max(1000, "Ko'pi bilan 1000 ball")], { error: "Butun son kiriting" })
      .transform((v) => (v === "" ? null : v)),
    maxAttempts: z.coerce.number({ error: "Son kiriting" }).int("Butun son kiriting").min(1, "Kamida 1 marta").max(20, "Ko'pi bilan 20 marta"),
    resultRelease: z.enum(["IMMEDIATE", "AFTER_END", "MANUAL"], { error: "Qiymatni tanlang" }),
    isPublished: z.boolean(),
    universityIds: z.array(z.string().min(1)).min(1, "Kamida bitta universitetni tanlang"),
  })
  .refine((t) => t.endsAt > t.startsAt, { path: ["endsAt"], message: "Tugash vaqti boshlanish vaqtidan keyin bo'lishi kerak" });

export const saveAnswerSchema = z.object({
  attemptId: z.string().min(1).max(64),
  questionId: z.string().min(1).max(64),
  selectedOptionIds: z.array(z.string().min(1).max(64)).max(10),
  flagged: z.boolean(),
});

export type FieldErrors = Record<string, string | undefined>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export type FormState = { ok?: boolean; message?: string; errors?: FieldErrors };
