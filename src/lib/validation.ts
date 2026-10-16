import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max, `Ko'pi bilan ${max} ta belgi`);

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
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/, "Loginda faqat lotin harflari, raqamlar va . _ - belgilari bo'lishi mumkin")
  .transform((v) => v.toLowerCase());

export const studentSchema = z.object({
  fullName: trimmed(120).min(3, "F.I.Sh. ni kiriting"),
  login: loginField,
  universityId: z.string().min(1, "Universitetni tanlang"),
  facultyName: trimmed(120).optional().transform((v) => v || null),
  groupName: trimmed(40).optional().transform((v) => v || null),
  studyForm: z
    .enum(["", "KUNDUZGI", "SIRTQI", "KECHKI", "MASOFAVIY"])
    .optional()
    .transform((v) => v || null),
  isActive: z.boolean(),
});

export const staffSchema = z
  .object({
    fullName: trimmed(120).min(3, "F.I.Sh. ni kiriting"),
    login: loginField,
    role: z.enum(["ADMIN", "MANAGER"], { message: "Rolni tanlang" }),
    universityId: z.string().optional().transform((v) => v || null),
    isActive: z.boolean(),
  })
  .refine((u) => u.role !== "MANAGER" || u.universityId, { path: ["universityId"], message: "Menejer uchun universitetni tanlang" });

export const nameSchema = (label: string, max = 120) => trimmed(max).min(1, `${label} nomini kiriting`);

export const questionSchema = z
  .object({
    text: trimmed(4000).min(3, "Savol matnini kiriting"),
    type: z.enum(["SINGLE", "MULTIPLE", "TRUE_FALSE"]),
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
    durationMinutes: z.coerce.number().int("Butun son kiriting").min(1, "Kamida 1 daqiqa").max(600, "Ko'pi bilan 600 daqiqa"),
    startsAt: z.date({ message: "Boshlanish vaqtini kiriting" }),
    endsAt: z.date({ message: "Tugash vaqtini kiriting" }),
    passingPercent: z.coerce.number().int().min(0).max(100),
    resultRelease: z.enum(["IMMEDIATE", "AFTER_END", "MANUAL"]),
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
