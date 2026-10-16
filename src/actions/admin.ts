"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireStaff, sortRoles } from "@/lib/auth";
import { canManageTest, resolveFacultyGroup } from "@/server/org";
import { endTestNow, ExamError, liveAttempts, recomputeDeadlines, rescoreTest } from "@/server/exam";
import { saveQuestions } from "@/server/import";
import { DEFAULT_STUDENT_PASSWORD, generateStudentLogins } from "@/server/student-account";
import { parseQuestionText, type ParsedQuestion } from "@/lib/question-text-parser";
import { hashPassword } from "@/lib/password";
import { fromLocalInput } from "@/lib/time";
import { getT } from "@/i18n/server";
import {
  fieldErrors,
  passwordSchema,
  nameSchema,
  questionSchema,
  staffSchema,
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
  // Talabalar va ularning natijalari saqlanadi: ular universitetsiz qoladi va
  // boshqa universitetga biriktirilguncha tizimga kira olmaydi.
  await prisma.$transaction([
    prisma.user.updateMany({ where: { universityId: id }, data: { universityId: null } }),
    prisma.university.delete({ where: { id } }),
  ]);
  revalidatePath("/admin/students");
  revalidatePath("/admin/universities");
}

/* ===================== Fakultetlar va guruhlar ===================== */

export async function saveFacultyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd.get("id"));
  const universityId = str(fd.get("universityId"));
  const name = nameSchema("Fakultet").safeParse(str(fd.get("name")));
  if (!name.success) return { errors: { name: name.error.issues[0]?.message } };
  try {
    if (id) await prisma.faculty.update({ where: { id }, data: { name: name.data } });
    else await prisma.faculty.create({ data: { universityId, name: name.data } });
  } catch (e) {
    if (isUnique(e)) return { errors: { name: "Bu nomdagi fakultet allaqachon mavjud" } };
    throw e;
  }
  revalidatePath(`/admin/universities/${universityId}`);
  return { ok: true, message: id ? "Fakultet yangilandi" : "Fakultet qo'shildi" };
}

export async function deleteFacultyAction(id: string): Promise<Result> {
  await requireAdmin();
  // Guruh va talabalar saqlanadi, faqat fakultetdan ajratiladi (onDelete: SetNull)
  const f = await prisma.faculty.delete({ where: { id } });
  revalidatePath(`/admin/universities/${f.universityId}`);
  revalidatePath("/admin/students");
}

export async function saveGroupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd.get("id"));
  const universityId = str(fd.get("universityId"));
  const facultyId = str(fd.get("facultyId")) || null;
  const name = nameSchema("Guruh", 40).safeParse(str(fd.get("name")));
  if (!name.success) return { errors: { name: name.error.issues[0]?.message } };
  if (facultyId && !(await prisma.faculty.count({ where: { id: facultyId, universityId } }))) {
    return { errors: { facultyId: "Fakultet topilmadi" } };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const g = id
        ? await tx.group.update({ where: { id }, data: { name: name.data, facultyId } })
        : await tx.group.create({ data: { universityId, name: name.data, facultyId } });
      // Guruh talabalarining fakulteti guruhnikiga moslanadi
      if (id && facultyId) await tx.user.updateMany({ where: { groupId: g.id }, data: { facultyId } });
    });
  } catch (e) {
    if (isUnique(e)) return { errors: { name: "Bu nomdagi guruh allaqachon mavjud" } };
    throw e;
  }
  revalidatePath(`/admin/universities/${universityId}`);
  return { ok: true, message: id ? "Guruh yangilandi" : "Guruh qo'shildi" };
}

export async function deleteGroupAction(id: string): Promise<Result> {
  await requireAdmin();
  const g = await prisma.group.delete({ where: { id } });
  revalidatePath(`/admin/universities/${g.universityId}`);
  revalidatePath("/admin/students");
}

/* ===================== Talabalar ===================== */

export async function saveStudentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const id = str(fd.get("id"));
  const parsed = studentSchema.safeParse({
    fullName: str(fd.get("fullName")),
    pinfl: str(fd.get("pinfl")),
    universityId: staff.scope ?? str(fd.get("universityId")),
    facultyName: str(fd.get("facultyName")),
    groupName: str(fd.get("groupName")),
    studyForm: str(fd.get("studyForm")),
    isActive: fd.get("isActive") === "on",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { facultyName, groupName, ...data } = parsed.data;
  // Faqat Super admin mavjud talabaning parolini boshlang'ich parolga tiklay oladi
  const resetPassword = !staff.scope && !!id && fd.get("resetPassword") === "on";

  const uni = await prisma.university.findUnique({ where: { id: data.universityId } });
  if (!uni) return { errors: { universityId: "Universitet topilmadi" } };

  const dup = await prisma.user.findFirst({ where: { pinfl: data.pinfl, ...(id ? { NOT: { id } } : {}) }, select: { fullName: true, login: true } });
  if (dup) {
    const { t } = await getT();
    return { errors: { pinfl: t("Bu JShShIR bilan talaba allaqachon mavjud: {name} ({login})", { name: dup.fullName, login: dup.login }) } };
  }

  let createdLogin: string | null = null;
  try {
    const org = await resolveFacultyGroup(data.universityId, facultyName, groupName);
    if (id) {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing || !existing.roles.includes("STUDENT") || (staff.scope && existing.universityId !== staff.scope)) {
        return { message: "Talaba topilmadi" };
      }
      await prisma.user.update({
        where: { id },
        data: {
          ...data,
          ...org,
          ...(resetPassword
            ? { passwordHash: await hashPassword(DEFAULT_STUDENT_PASSWORD), mustChangePassword: true, failedLogins: 0, lockedUntil: null }
            : {}),
        },
      });
      if (resetPassword || !data.isActive) await prisma.session.deleteMany({ where: { userId: id } });
    } else {
      // Login avtomatik: 7 xonali raqam. Parol: boshlang'ich, birinchi kirishda almashtiriladi.
      const passwordHash = await hashPassword(DEFAULT_STUDENT_PASSWORD);
      for (let i = 0; i < 3 && !createdLogin; i++) {
        const [login] = await generateStudentLogins(1);
        try {
          await prisma.user.create({ data: { ...data, ...org, login: login!, role: "STUDENT", passwordHash, mustChangePassword: true } });
          createdLogin = login!;
        } catch (e) {
          if (!(isUnique(e) && String((e as Prisma.PrismaClientKnownRequestError).meta?.target).includes("login"))) throw e;
        }
      }
      if (!createdLogin) return { message: "Login yaratib bo'lmadi, qayta urinib ko'ring" };
    }
  } catch (e) {
    if (isUnique(e)) return { errors: { pinfl: "Bu JShShIR bilan talaba allaqachon mavjud" } };
    throw e;
  }
  revalidatePath("/admin/students");
  const { t } = await getT();
  if (createdLogin) {
    return { ok: true, message: t("Talaba qo'shildi. Login: {login}, boshlang'ich parol: {password}", { login: createdLogin, password: DEFAULT_STUDENT_PASSWORD }) };
  }
  return { ok: true, message: resetPassword ? t("Ma'lumotlar yangilandi, parol {password} ga tiklandi", { password: DEFAULT_STUDENT_PASSWORD }) : "Talaba ma'lumotlari yangilandi" };
}

/** Tanlangan talabalarni bitta guruhga (va fakultetga) biriktiradi. */
export async function assignStudentsGroupAction(
  ids: string[],
  input: { facultyName: string; groupName: string; studyForm: string },
): Promise<Result & { count?: number }> {
  const staff = await requireStaff();
  const list = Array.from(new Set(ids)).slice(0, 1000);
  if (!list.length) return { error: "Talaba tanlanmadi" };
  const students = await prisma.user.findMany({
    where: { id: { in: list }, roles: { has: "STUDENT" }, ...(staff.scope ? { universityId: staff.scope } : {}) },
    select: { id: true, universityId: true },
  });
  const unis = new Set(students.map((s) => s.universityId));
  if (!students.length) return { error: "Talabalar topilmadi" };
  if (unis.size !== 1 || !students[0]!.universityId) {
    return { error: "Tanlangan talabalar bitta universitetdan bo'lishi kerak" };
  }
  const groupName = input.groupName.trim();
  const facultyName = input.facultyName.trim();
  if (!groupName && !facultyName && !input.studyForm) return { error: "Guruh, fakultet yoki ta'lim shaklini kiriting" };
  if (input.studyForm && !["KUNDUZGI", "SIRTQI", "KECHKI", "MASOFAVIY"].includes(input.studyForm)) {
    return { error: "Ta'lim shakli noto'g'ri" };
  }
  const org = await resolveFacultyGroup(students[0]!.universityId, facultyName, groupName);
  await prisma.user.updateMany({
    where: { id: { in: students.map((s) => s.id) } },
    data: {
      ...(groupName ? { groupId: org.groupId } : {}),
      ...(facultyName || (groupName && org.facultyId) ? { facultyId: org.facultyId } : {}),
      ...(input.studyForm ? { studyForm: input.studyForm as "KUNDUZGI" } : {}),
    },
  });
  revalidatePath("/admin/students");
  return { count: students.length };
}

export async function deleteStudentAction(id: string): Promise<Result> {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id }, include: { _count: { select: { attempts: true } } } });
  if (!user || !user.roles.includes("STUDENT")) return { error: "Talaba topilmadi" };
  const otherRoles = user.roles.filter((r) => r !== "STUDENT");
  if (otherRoles.length) {
    // Boshqa rollari bor: hisob saqlanadi, faqat talaba roli olib tashlanadi
    await prisma.user.update({ where: { id }, data: { roles: otherRoles, role: otherRoles[0] } });
    revalidatePath("/admin/students");
    return;
  }
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
  if (used > 0) {
    const { t } = await getT();
    return { error: t("Savol {count} ta testga biriktirilgan. Avval uni testlardan olib tashlang.", { count: used }) };
  }
  const answered = await prisma.answer.count({ where: { questionId: id } });
  if (answered > 0) return { error: "Bu savolga talabalar javob bergan, uni o'chirib bo'lmaydi." };
  await prisma.question.delete({ where: { id } });
  revalidatePath("/admin/questions");
}

/* ===================== Testlar ===================== */

export async function saveTestAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const id = str(fd.get("id"));
  if (id && !(await canManageTest(staff.scope, id))) return { message: "Test topilmadi" };
  const parsed = testSchema.safeParse({
    title: str(fd.get("title")),
    description: str(fd.get("description")),
    subject: str(fd.get("subject")),
    durationMinutes: str(fd.get("durationMinutes")),
    startsAt: fromLocalInput(str(fd.get("startsAt"))) ?? undefined,
    endsAt: fromLocalInput(str(fd.get("endsAt"))) ?? undefined,
    passingPercent: str(fd.get("passingPercent")) || "60",
    questionsPerAttempt: str(fd.get("questionsPerAttempt")).trim(),
    maxScore: str(fd.get("maxScore")).trim(),
    maxAttempts: str(fd.get("maxAttempts")).trim() || "1",
    resultRelease: str(fd.get("resultRelease")),
    isPublished: fd.get("isPublished") === "on",
    universityIds: staff.scope ? [staff.scope] : fd.getAll("universityIds").map(String),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { universityIds, ...data } = parsed.data;

  const unis = await prisma.university.count({ where: { id: { in: universityIds } } });
  if (unis !== universityIds.length) return { errors: { universityIds: "Universitet topilmadi" } };

  // Yangi test yaratishda Word fayldan (platformada tuzatilgan) savollar matni
  const questionsText = id ? "" : str(fd.get("questionsText")).slice(0, 2_000_000);
  let imported: ParsedQuestion[] = [];
  if (questionsText.trim()) {
    const { t } = await getT();
    const res = parseQuestionText(questionsText, t);
    if (res.issues.length) return { errors: { questionsText: "Savollar matnida xatolar bor. Avval ularni tuzating." } };
    if (res.questions.length > 1000) return { errors: { questionsText: "Bir martada ko'pi bilan 1000 ta savol" } };
    imported = res.questions;
  }

  if (data.isPublished) {
    const qCount = id ? await prisma.testQuestion.count({ where: { testId: id } }) : imported.length;
    if (qCount === 0) {
      return { errors: { isPublished: "Savolsiz testni faollashtirib bo'lmaydi. Avval savollar qo'shing." } };
    }
  }

  let testId = id;
  if (id) {
    const before = await prisma.test.findUnique({
      where: { id },
      select: { maxScore: true, questionsPerAttempt: true, durationMinutes: true, endsAt: true, _count: { select: { attempts: true } } },
    });
    if (before && before._count.attempts > 0 && before.questionsPerAttempt !== data.questionsPerAttempt) {
      return { errors: { questionsPerAttempt: "Talabalar testni boshlagan, savollar sonini o'zgartirib bo'lmaydi" } };
    }
    await prisma.test.update({
      where: { id },
      data: { ...data, universities: { set: universityIds.map((u) => ({ id: u })) } },
    });
    if (before && before.maxScore !== data.maxScore) await rescoreTest(id);
    if (before && (before.durationMinutes !== data.durationMinutes || before.endsAt.getTime() !== data.endsAt.getTime())) {
      await recomputeDeadlines(id);
    }
    revalidatePath("/admin/results");
  } else {
    const t = await prisma.test.create({
      data: { ...data, createdById: staff.id, universities: { connect: universityIds.map((u) => ({ id: u })) } },
    });
    testId = t.id;
    if (imported.length) await saveQuestions(imported, testId);
  }
  revalidatePath("/admin/tests");
  redirect(`/admin/tests/${testId}${id ? "?saved=1" : ""}`);
}

/** Testni natijalari (urinishlar, javoblar) bilan birga butunlay o'chiradi. Faqat administrator. */
export async function deleteTestAction(id: string): Promise<Result> {
  await requireAdmin();
  await prisma.test.delete({ where: { id } });
  revalidatePath("/admin/tests");
  revalidatePath("/admin/results");
  redirect("/admin/tests");
}

export async function deleteTestsAction(ids: string[]): Promise<Result & { count?: number }> {
  await requireAdmin();
  const list = Array.from(new Set(ids)).slice(0, 500);
  if (!list.length) return { error: "Test tanlanmadi" };
  const r = await prisma.test.deleteMany({ where: { id: { in: list } } });
  revalidatePath("/admin/tests");
  revalidatePath("/admin/results");
  return { count: r.count };
}

/** Testni faol (talabalarga ko'rinadi) yoki nofaol qiladi. */
export async function setTestActiveAction(id: string, active: boolean): Promise<Result> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, id))) return { error: "Test topilmadi" };
  if (active && (await prisma.testQuestion.count({ where: { testId: id } })) === 0) {
    return { error: "Savolsiz testni faollashtirib bo'lmaydi. Avval savollar qo'shing." };
  }
  await prisma.test.update({ where: { id }, data: { isPublished: active } });
  revalidatePath("/admin/tests");
  revalidatePath(`/admin/tests/${id}`);
}

/** Test vaqti, davomiyligi va jami bahosini o'zgartirish (test boshlangandan keyin ham). */
export async function updateTestScheduleAction(testId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { message: "Test topilmadi" };
  const startsAt = fromLocalInput(str(fd.get("startsAt")));
  const endsAt = fromLocalInput(str(fd.get("endsAt")));
  const duration = Number(str(fd.get("durationMinutes")));
  const maxRaw = str(fd.get("maxScore")).trim();
  const maxScore = maxRaw === "" ? null : Number(maxRaw);
  const qRaw = str(fd.get("questionsPerAttempt")).trim();
  const questionsPerAttempt = qRaw === "" ? null : Number(qRaw);
  const maxAttempts = Number(str(fd.get("maxAttempts")).trim() || "1");
  const errors: Record<string, string> = {};
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) errors.maxAttempts = "1–20 marta";
  if (questionsPerAttempt !== null && (!Number.isInteger(questionsPerAttempt) || questionsPerAttempt < 1 || questionsPerAttempt > 1000)) {
    errors.questionsPerAttempt = "1–1000 ta";
  }
  if (!startsAt) errors.startsAt = "Boshlanish vaqtini kiriting";
  if (!endsAt) errors.endsAt = "Tugash vaqtini kiriting";
  if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = "Tugash vaqti boshlanishdan keyin bo'lsin";
  if (!Number.isInteger(duration) || duration < 1 || duration > 600) errors.durationMinutes = "1–600 daqiqa";
  if (maxScore !== null && (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000)) errors.maxScore = "1–1000 ball";
  if (Object.keys(errors).length) return { errors };
  const before = await prisma.test.findUniqueOrThrow({
    where: { id: testId },
    select: { maxScore: true, questionsPerAttempt: true, _count: { select: { attempts: true } } },
  });
  if (before._count.attempts > 0 && before.questionsPerAttempt !== questionsPerAttempt) {
    return { errors: { questionsPerAttempt: "Test boshlangan, savollar sonini o'zgartirib bo'lmaydi" } };
  }
  await prisma.test.update({
    where: { id: testId },
    data: { startsAt: startsAt!, endsAt: endsAt!, durationMinutes: duration, maxScore, questionsPerAttempt, maxAttempts },
  });
  await recomputeDeadlines(testId);
  let rescored = 0;
  if (before.maxScore !== maxScore) rescored = await rescoreTest(testId);
  revalidatePath(`/admin/tests/${testId}`);
  revalidatePath("/admin/tests");
  revalidatePath("/admin/results");
  const { t } = await getT();
  return { ok: true, message: rescored ? t("Saqlandi. {count} ta natija yangi bahoga moslandi.", { count: rescored }) : "Saqlandi" };
}

/* ----- Talabalarga alohida ruxsat ----- */

export async function setTestRestrictedAction(testId: string, restricted: boolean): Promise<Result> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { error: "Test topilmadi" };
  await prisma.test.update({ where: { id: testId }, data: { restrictedAccess: restricted } });
  revalidatePath(`/admin/tests/${testId}`);
}

type AccessFilter = { universityId?: string; facultyId?: string; groupId?: string; q?: string };

async function accessBase(testId: string, f: AccessFilter): Promise<Prisma.UserWhereInput> {
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { universities: { select: { id: true } } } });
  const uniIds = test?.universities.map((u) => u.id) ?? [];
  const q = (f.q ?? "").trim().slice(0, 100);
  return {
    roles: { has: "STUDENT" },
    universityId: f.universityId && uniIds.includes(f.universityId) ? f.universityId : { in: uniIds },
    ...(f.facultyId ? { facultyId: f.facultyId } : {}),
    ...(f.groupId ? { groupId: f.groupId } : {}),
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { login: { contains: q, mode: "insensitive" } }] } : {}),
  };
}

/** Ruxsat berish uchun talabalar ro'yxati (filtr bo'yicha, ruxsati bor-yo'qligi bilan). */
export async function listAccessCandidatesAction(testId: string, f: AccessFilter) {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { error: "Test topilmadi", rows: [], total: 0 };
  const where = await accessBase(testId, f);
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      take: 500,
      select: {
        id: true,
        fullName: true,
        login: true,
        group: { select: { name: true } },
        testAccess: { where: { testId }, select: { testId: true } },
      },
    }),
  ]);
  return {
    total,
    rows: rows.map((r) => ({ id: r.id, fullName: r.fullName, login: r.login, group: r.group?.name ?? null, allowed: r.testAccess.length > 0 })),
  };
}

/** Tanlangan talabalarga yoki filtrga mos barcha talabalarga ruxsat beradi. */
export async function addTestAccessAction(
  testId: string,
  input: AccessFilter & { userIds?: string[]; all?: boolean },
): Promise<Result & { added?: number }> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { error: "Test topilmadi" };
  const base = await accessBase(testId, input);
  const where: Prisma.UserWhereInput = input.all ? base : { AND: [base, { id: { in: (input.userIds ?? []).slice(0, 5000) } }] };
  const students = await prisma.user.findMany({ where, select: { id: true } });
  if (!students.length) return { error: "Talabalar topilmadi" };
  const r = await prisma.testAccess.createMany({ data: students.map((s) => ({ testId, userId: s.id })), skipDuplicates: true });
  revalidatePath(`/admin/tests/${testId}`);
  return { added: r.count };
}

/** Filtrga mos barcha talabalar ruxsatini olib tashlaydi. */
export async function removeTestAccessByFilterAction(testId: string, f: AccessFilter): Promise<Result> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { error: "Test topilmadi" };
  const base = await accessBase(testId, f);
  await prisma.testAccess.deleteMany({ where: { testId, user: base } });
  revalidatePath(`/admin/tests/${testId}`);
}

export async function removeTestAccessAction(testId: string, userIds: string[]): Promise<Result> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { error: "Test topilmadi" };
  await prisma.testAccess.deleteMany({ where: { testId, ...(userIds.length ? { userId: { in: userIds } } : {}) } });
  revalidatePath(`/admin/tests/${testId}`);
}

async function assertQuestionsEditable(testId: string): Promise<string | null> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return "Test topilmadi";
  const n = await prisma.attempt.count({ where: { testId } });
  return n > 0 ? "Test boshlangan, savollar tarkibini o'zgartirib bo'lmaydi." : null;
}

export async function addQuestionsToTestAction(testId: string, questionIds: string[]): Promise<Result> {
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
  const admin = await requireStaff();
  const fullName = str(fd.get("fullName")).trim();
  if (fullName.length < 3 || fullName.length > 120) return { errors: { fullName: "Ism 3–120 belgidan iborat bo'lsin" } };
  await prisma.user.update({ where: { id: admin.id }, data: { fullName } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Ma'lumotlar saqlandi" };
}

/* ===================== Rollar (administrator va menejerlar) ===================== */

export async function saveStaffUserAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd.get("id"));
  const parsed = staffSchema.safeParse({
    fullName: str(fd.get("fullName")),
    login: str(fd.get("login")),
    roles: fd.getAll("roles").map(String),
    universityId: str(fd.get("universityId")),
    isActive: fd.get("isActive") === "on",
  });
  const password = str(fd.get("password"));
  const errors = parsed.success ? {} : fieldErrors(parsed.error);
  if (!id || password) {
    const pw = passwordSchema.safeParse(password);
    if (!pw.success) errors.password = pw.error.issues[0]?.message;
  }
  if (!parsed.success || Object.keys(errors).length) return { errors };
  const roles = sortRoles(parsed.data.roles);
  const needsUni = roles.includes("MANAGER") || roles.includes("STUDENT");
  const data = {
    fullName: parsed.data.fullName,
    login: parsed.data.login,
    isActive: parsed.data.isActive,
    roles,
    role: roles[0]!,
    universityId: needsUni ? parsed.data.universityId : null,
  };
  if (id === admin.id && (!roles.includes("ADMIN") || !data.isActive)) {
    return { message: "O'zingizning Super admin rolingizni olib tashlay yoki hisobingizni o'chira olmaysiz" };
  }
  if (data.universityId && !(await prisma.university.count({ where: { id: data.universityId } }))) {
    return { errors: { universityId: "Universitet topilmadi" } };
  }
  try {
    if (id) {
      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) return { message: "Foydalanuvchi topilmadi" };
      await prisma.user.update({
        where: { id },
        data: {
          ...data,
          ...(password ? { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } : {}),
        },
      });
      if (id !== admin.id) await prisma.session.deleteMany({ where: { userId: id } });
    } else {
      await prisma.user.create({ data: { ...data, passwordHash: await hashPassword(password) } });
    }
  } catch (e) {
    if (isUnique(e)) return { errors: { login: "Bu login band" } };
    throw e;
  }
  revalidatePath("/admin/users");
  revalidatePath("/admin/students");
  return { ok: true, message: id ? "Foydalanuvchi yangilandi" : "Foydalanuvchi qo'shildi" };
}

export async function deleteStaffUserAction(id: string): Promise<Result> {
  const admin = await requireAdmin();
  if (id === admin.id) return { error: "O'zingizni o'chira olmaysiz" };
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return { error: "Foydalanuvchi topilmadi" };
  if (u.roles.includes("STUDENT") && (await prisma.attempt.count({ where: { userId: id } }))) {
    // Talaba sifatida natijalari bor: hisob saqlanadi, faqat xodim rollari olinadi
    await prisma.user.update({ where: { id }, data: { roles: ["STUDENT"], role: "STUDENT" } });
    await prisma.session.deleteMany({ where: { userId: id } });
    revalidatePath("/admin/users");
    return;
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
}

/** Foydalanuvchini faol yoki nofaol qiladi. Nofaol foydalanuvchi tizimga kira olmaydi. */
export async function setUserActiveAction(id: string, active: boolean): Promise<Result> {
  const staff = await requireStaff();
  if (id === staff.id && !active) return { error: "O'zingizni nofaol qila olmaysiz" };
  const user = await prisma.user.findUnique({ where: { id }, select: { roles: true, universityId: true } });
  if (!user) return { error: "Foydalanuvchi topilmadi" };
  // Menejer faqat o'z universitetining talabalarini boshqaradi
  if (staff.scope && (user.universityId !== staff.scope || user.roles.some((r) => r !== "STUDENT"))) {
    return { error: "Bu amal uchun ruxsat yo'q" };
  }
  await prisma.user.update({ where: { id }, data: { isActive: active } });
  if (!active) await prisma.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin/students");
  revalidatePath("/admin/users");
}

/** Test natijalarini (urinishlarni) o'chirish. Faqat Super admin. */
export async function deleteResultsAction(ids: string[]): Promise<Result & { count?: number }> {
  await requireAdmin();
  const list = Array.from(new Set(ids)).slice(0, 500);
  if (!list.length) return { error: "Natija tanlanmadi" };
  const r = await prisma.attempt.deleteMany({ where: { id: { in: list } } });
  revalidatePath("/admin/results");
  revalidatePath("/admin/tests");
  revalidatePath("/admin");
  return { count: r.count };
}

/** Hozir testni ishlayotgan talabalar (yakunlash yoki vaqtni o'zgartirishdan oldin ogohlantirish uchun). */
export async function liveAttemptsAction(testId: string): Promise<{ count: number; names: string[] }> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { count: 0, names: [] };
  const rows = await liveAttempts(testId);
  return { count: rows.length, names: rows.slice(0, 20).map((r) => r.user.fullName) };
}

/** Ochiq testni muddatidan oldin yakunlash. */
export async function endTestNowAction(testId: string): Promise<{ error?: string; finalized?: number }> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { error: "Test topilmadi" };
  try {
    const finalized = await endTestNow(testId);
    revalidatePath(`/admin/tests/${testId}`);
    revalidatePath("/admin/tests");
    revalidatePath("/admin/results");
    revalidatePath("/admin");
    return { finalized };
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    throw e;
  }
}

/** Universitetni faol yoki nofaol qiladi. Nofaol universitet talabalari va menejerlari tizimga kira olmaydi. */
export async function setUniversityActiveAction(id: string, active: boolean): Promise<Result> {
  await requireAdmin();
  await prisma.university.update({ where: { id }, data: { isActive: active } });
  if (!active) {
    await prisma.session.deleteMany({ where: { user: { universityId: id, NOT: { roles: { has: "ADMIN" } } } } });
  }
  revalidatePath("/admin/universities");
  revalidatePath("/admin");
}
