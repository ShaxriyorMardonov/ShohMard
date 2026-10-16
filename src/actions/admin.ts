"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { fromLocalInput } from "@/lib/time";
import {
  fieldErrors,
  passwordSchema,
  questionSchema,
  studentSchema,
  testSchema,
  universitySchema,
  type FormState,
} from "@/lib/validation";

type Result = { error?: string } | void;

function isUnique(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/* ===================== Universitetlar ===================== */

export async function saveUniversityAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd.get("id"));
  const parsed = universitySchema.safeParse({
    name: str(fd.get("name")),
    shortName: str(fd.get("shortName")),
    city: str(fd.get("city")),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  try {
    if (id) await prisma.university.update({ where: { id }, data: parsed.data });
    else await prisma.university.create({ data: parsed.data });
  } catch (e) {
    if (isUnique(e)) return { errors: { name: "Bu nomdagi universitet allaqachon mavjud" } };
    throw e;
  }
  revalidatePath("/admin/universities");
  return { ok: true, message: id ? "Universitet yangilandi" : "Universitet qo'shildi" };
}

export async function deleteUniversityAction(id: string): Promise<Result> {
  await requireAdmin();
  const students = await prisma.user.count({ where: { universityId: id } });
  if (students > 0) return { error: `Bu universitetda ${students} ta talaba bor. Avval ularni boshqa universitetga o'tkazing yoki o'chiring.` };
  await prisma.university.delete({ where: { id } });
  revalidatePath("/admin/universities");
}

/* ===================== Talabalar ===================== */

export async function saveStudentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd.get("id"));
  const parsed = studentSchema.safeParse({
    fullName: str(fd.get("fullName")),
    login: str(fd.get("login")),
    universityId: str(fd.get("universityId")),
    groupName: str(fd.get("groupName")),
    isActive: fd.get("isActive") === "on",
  });
  const password = str(fd.get("password"));
  const errors = parsed.success ? {} : fieldErrors(parsed.error);
  if (!id || password) {
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) errors.password = pw.error.issues[0]?.message;
  }
  if (!parsed.success || Object.keys(errors).length) return { errors };

  const uni = await prisma.university.findUnique({ where: { id: parsed.data.universityId } });
  if (!uni) return { errors: { universityId: "Universitet topilmadi" } };

  try {
    if (id) {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing || existing.role !== "STUDENT") return { message: "Talaba topilmadi" };
      await prisma.user.update({
        where: { id },
        data: {
          ...parsed.data,
          ...(password ? { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } : {}),
        },
      });
      if (password || !parsed.data.isActive) await prisma.session.deleteMany({ where: { userId: id } });
    } else {
      await prisma.user.create({
        data: { ...parsed.data, role: "STUDENT", passwordHash: await hashPassword(password) },
      });
    }
  } catch (e) {
    if (isUnique(e)) return { errors: { login: "Bu login band" } };
    throw e;
  }
  revalidatePath("/admin/students");
  return { ok: true, message: id ? "Talaba ma'lumotlari yangilandi" : "Talaba qo'shildi" };
}

export async function deleteStudentAction(id: string): Promise<Result> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id }, include: { _count: { select: { attempts: true } } } });
  if (!user || user.role !== "STUDENT") return { error: "Talaba topilmadi" };
  if (user._count.attempts > 0) {
    return { error: "Talabaning imtihon natijalari mavjud. Natijalarni saqlash uchun hisobni o'chirish o'rniga nofaol qiling." };
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/students");
}

/* ===================== Savollar banki ===================== */

async function questionLocked(questionId: string) {
  const n = await prisma.answer.count({ where: { questionId } });
  const inStarted = await prisma.testQuestion.count({ where: { questionId, test: { attempts: { some: {} } } } });
  return n > 0 || inStarted > 0;
}

export async function saveQuestionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd.get("id"));
  let options: unknown;
  try {
    options = JSON.parse(str(fd.get("options")) || "[]");
  } catch {
    return { message: "Variantlar formati noto'g'ri" };
  }
  const parsed = questionSchema.safeParse({
    text: str(fd.get("text")),
    type: str(fd.get("type")),
    subject: str(fd.get("subject")),
    explanation: str(fd.get("explanation")),
    options,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { options: opts, ...data } = parsed.data;

  if (id) {
    if (await questionLocked(id)) {
      return { message: "Bu savol boshlangan imtihonlarda ishlatilgan, uni o'zgartirib bo'lmaydi. Yangi savol yarating." };
    }
    await prisma.$transaction([
      prisma.questionOption.deleteMany({ where: { questionId: id } }),
      prisma.question.update({
        where: { id },
        data: { ...data, options: { create: opts.map((o, i) => ({ ...o, position: i })) } },
      }),
    ]);
  } else {
    await prisma.question.create({
      data: { ...data, options: { create: opts.map((o, i) => ({ ...o, position: i })) } },
    });
  }
  revalidatePath("/admin/questions");
  redirect("/admin/questions?saved=1");
}

export async function deleteQuestionAction(id: string): Promise<Result> {
  await requireAdmin();
  const used = await prisma.testQuestion.count({ where: { questionId: id } });
  if (used > 0) return { error: `Savol ${used} ta testga biriktirilgan. Avval uni testlardan olib tashlang.` };
  const answered = await prisma.answer.count({ where: { questionId: id } });
  if (answered > 0) return { error: "Bu savolga talabalar javob bergan, uni o'chirib bo'lmaydi." };
  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/questions");
}

/* ===================== Testlar ===================== */

export async function saveTestAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("id"));
  const parsed = testSchema.safeParse({
    title: str(fd.get("title")),
    description: str(fd.get("description")),
    subject: str(fd.get("subject")),
    durationMinutes: str(fd.get("durationMinutes")),
    startsAt: fromLocalInput(str(fd.get("startsAt"))) ?? undefined,
    endsAt: fromLocalInput(str(fd.get("endsAt"))) ?? undefined,
    passingPercent: str(fd.get("passingPercent")) || "60",
    resultRelease: str(fd.get("resultRelease")),
    isPublished: fd.get("isPublished") === "on",
    universityIds: fd.getAll("universityIds").map(String),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { universityIds, ...data } = parsed.data;

  const unis = await prisma.university.count({ where: { id: { in: universityIds } } });
  if (unis !== universityIds.length) return { errors: { universityIds: "Universitet topilmadi" } };

  if (data.isPublished) {
    const qCount = id ? await prisma.testQuestion.count({ where: { testId: id } }) : 0;
    if (qCount === 0) {
      return { errors: { isPublished: "Savolsiz testni nashr etib bo'lmaydi. Avval savollar qo'shing." } };
    }
  }

  let testId = id;
  if (id) {
    await prisma.test.update({
      where: { id },
      data: { ...data, universities: { set: universityIds.map((u) => ({ id: u })) } },
    });
  } else {
    const t = await prisma.test.create({
      data: { ...data, createdById: admin.id, universities: { connect: universityIds.map((u) => ({ id: u })) } },
    });
    testId = t.id;
  }
  revalidatePath("/admin/tests");
  redirect(`/admin/tests/${testId}${id ? "?saved=1" : ""}`);
}

export async function deleteTestAction(id: string): Promise<Result> {
  await requireAdmin();
  const attempts = await prisma.attempt.count({ where: { testId: id } });
  if (attempts > 0) return { error: "Bu testni talabalar topshirgan. Natijalarni saqlash uchun testni o'chirib bo'lmaydi; uni nashrdan oling." };
  await prisma.test.delete({ where: { id } });
  revalidatePath("/admin/tests");
  redirect("/admin/tests");
}

async function assertQuestionsEditable(testId: string): Promise<string | null> {
  const n = await prisma.attempt.count({ where: { testId } });
  return n > 0 ? "Test boshlangan, savollar tarkibini o'zgartirib bo'lmaydi." : null;
}

export async function addQuestionsToTestAction(testId: string, questionIds: string[]): Promise<Result> {
  await requireAdmin();
  const locked = await assertQuestionsEditable(testId);
  if (locked) return { error: locked };
  const ids = Array.from(new Set(questionIds.map(String))).slice(0, 500);
  if (!ids.length) return { error: "Savol tanlanmadi" };
  const valid = await prisma.question.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const max = await prisma.testQuestion.aggregate({ where: { testId }, _max: { position: true } });
  let pos = (max._max.position ?? -1) + 1;
  await prisma.testQuestion.createMany({
    data: valid.map((q) => ({ testId, questionId: q.id, position: pos++ })),
    skipDuplicates: true,
  });
  revalidatePath(`/admin/tests/${testId}`);
}

export async function removeQuestionFromTestAction(testId: string, questionId: string): Promise<Result> {
  await requireAdmin();
  const locked = await assertQuestionsEditable(testId);
  if (locked) return { error: locked };
  await prisma.testQuestion.delete({ where: { testId_questionId: { testId, questionId } } });
  const remaining = await prisma.testQuestion.count({ where: { testId } });
  if (remaining === 0) await prisma.test.update({ where: { id: testId }, data: { isPublished: false } });
  revalidatePath(`/admin/tests/${testId}`);
}

export async function updateTestQuestionAction(
  testId: string,
  questionId: string,
  patch: { points?: number; move?: "up" | "down" },
): Promise<Result> {
  await requireAdmin();
  const locked = await assertQuestionsEditable(testId);
  if (locked) return { error: locked };
  if (patch.points !== undefined) {
    const p = Math.round(Number(patch.points));
    if (!Number.isFinite(p) || p < 1 || p > 100) return { error: "Ball 1 dan 100 gacha bo'lishi kerak" };
    await prisma.testQuestion.update({ where: { testId_questionId: { testId, questionId } }, data: { points: p } });
  }
  if (patch.move) {
    const list = await prisma.testQuestion.findMany({ where: { testId }, orderBy: { position: "asc" } });
    const i = list.findIndex((x) => x.questionId === questionId);
    const j = patch.move === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j]!, list[i]!];
      await prisma.$transaction(
        list.map((x, idx) =>
          prisma.testQuestion.update({ where: { testId_questionId: { testId, questionId: x.questionId } }, data: { position: idx } }),
        ),
      );
    }
  }
  revalidatePath(`/admin/tests/${testId}`);
}

export async function setResultsReleasedAction(testId: string, released: boolean): Promise<Result> {
  await requireAdmin();
  const t = await prisma.test.findUnique({ where: { id: testId } });
  if (!t) return { error: "Test topilmadi" };
  if (t.resultRelease !== "MANUAL") return { error: "Bu testda natijalar avtomatik e'lon qilinadi" };
  await prisma.test.update({ where: { id: testId }, data: { resultsReleasedAt: released ? new Date() : null } });
  revalidatePath(`/admin/tests/${testId}`);
  revalidatePath("/admin/results");
}

/* ===================== Sozlamalar ===================== */

export async function updateAdminProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const fullName = str(fd.get("fullName")).trim();
  if (fullName.length < 3 || fullName.length > 120) return { errors: { fullName: "Ism 3–120 belgidan iborat bo'lsin" } };
  await prisma.user.update({ where: { id: admin.id }, data: { fullName } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Ma'lumotlar saqlandi" };
}
