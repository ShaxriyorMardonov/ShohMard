import "server-only";
import { seededShuffle } from "@/lib/shuffle";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { OLYMPIAD_KINDS, type OlympiadKind } from "@/lib/olympiad";
import {
  SAVE_GRACE_MS,
  computeDeadline,
  gradeAttempt,
  isExpired,
  pickQuestionIds,
  scaleScore,
  testState,
  validateSelection,
} from "@/lib/exam-rules";

export class ExamError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "NOT_OPEN"
      | "ALREADY_SUBMITTED"
      | "EXPIRED"
      | "INVALID",
  ) {
    super(message);
  }
}

/** Talaba ko'ra oladigan oddiy testlar: faol, universitetiga biriktirilgan va (cheklangan bo'lsa) ruxsat berilgan. */
export function studentTestWhere(userId: string, universityId: string): Prisma.TestWhereInput {
  return {
    kind: "REGULAR",
    isPublished: true,
    universities: { some: { id: universityId } },
    OR: [{ restrictedAccess: false }, { access: { some: { userId } } }],
  };
}

/** Faol olimpiada testlari: tizimdagi talabalar va ro'yxatdan o'tgan ishtirokchilar uchun ochiq. */
export function olympiadTestWhere(kind?: OlympiadKind): Prisma.TestWhereInput {
  return { kind: kind ?? { in: OLYMPIAD_KINDS }, isPublished: true };
}

/** Foydalanuvchi boshlay oladigan testlar: universitet testlari (talaba bo'lsa) va olimpiadalar. */
export function examineeTestWhere(userId: string, universityId: string | null): Prisma.TestWhereInput {
  return universityId ? { OR: [studentTestWhere(userId, universityId), olympiadTestWhere()] } : olympiadTestWhere();
}

/**
 * Attemptni yakunlaydi va server tomonida baholaydi.
 * Bir vaqtda ikki marta chaqirilsa ham faqat bir marta baholanadi.
 */
export async function finalizeAttempt(attemptId: string, opts: { auto: boolean; now?: Date }) {
  const now = opts.now ?? new Date();
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findUnique({
      where: { id: attemptId },
      select: { id: true, status: true, testId: true, deadlineAt: true, questionIds: true, test: { select: { maxScore: true } } },
    });
    if (!attempt) throw new ExamError("Urinish topilmadi", "NOT_FOUND");

    // Holatni shartli o'zgartirish qatorni bloklaydi; parallel chaqiruvlardan faqat biri o'tadi.
    const submittedAt = now > attempt.deadlineAt ? attempt.deadlineAt : now;
    const claimed = await tx.attempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: { status: "SUBMITTED", submittedAt, autoSubmitted: opts.auto },
    });
    if (claimed.count === 0) return { alreadyFinalized: true as const };

    const questions = await tx.testQuestion.findMany({
      where: { testId: attempt.testId, ...(attempt.questionIds.length ? { questionId: { in: attempt.questionIds } } : {}) },
      select: {
        questionId: true,
        points: true,
        question: { select: { options: { where: { isCorrect: true }, select: { id: true } } } },
      },
    });
    const answers = await tx.answer.findMany({
      where: { attemptId },
      select: { questionId: true, selectedOptionIds: true },
    });
    const answerMap = new Map(answers.map((a) => [a.questionId, a.selectedOptionIds]));
    const result = gradeAttempt(
      questions.map((q) => ({
        questionId: q.questionId,
        points: q.points,
        correctOptionIds: q.question.options.map((o) => o.id),
      })),
      answerMap,
    );

    for (const a of answers) {
      const g = result.perQuestion.get(a.questionId);
      await tx.answer.update({
        where: { attemptId_questionId: { attemptId, questionId: a.questionId } },
        data: { isCorrect: g?.isCorrect ?? false, pointsAwarded: g?.points ?? 0 },
      });
    }

    const scaled = scaleScore(result.score, result.maxScore, attempt.test.maxScore);
    await tx.attempt.update({
      where: { id: attemptId },
      data: {
        score: scaled.score,
        maxScore: scaled.maxScore,
        percent: result.percent,
        correctCount: result.correctCount,
        totalQuestions: questions.length,
      },
    });
    return { alreadyFinalized: false as const, ...result, ...scaled };
  });
}

/** Muddati o'tgan, lekin hali yakunlanmagan urinishlarni avtomatik topshiradi. */
export async function finalizeExpiredAttempts(filter: { userId?: string; testId?: string } = {}) {
  const cutoff = new Date(Date.now() - SAVE_GRACE_MS);
  const expired = await prisma.attempt.findMany({
    where: { status: "IN_PROGRESS", deadlineAt: { lt: cutoff }, ...filter },
    select: { id: true },
    take: 500,
  });
  for (const a of expired) {
    await finalizeAttempt(a.id, { auto: true });
  }
  return expired.length;
}

export async function startAttempt(userId: string, universityId: string | null, testId: string) {
  const now = new Date();
  const test = await prisma.test.findFirst({
    where: { AND: [{ id: testId }, examineeTestWhere(userId, universityId)] },
    select: {
      id: true,
      isPublished: true,
      startsAt: true,
      endsAt: true,
      durationMinutes: true,
      questionsPerAttempt: true,
      maxAttempts: true,
      questions: { orderBy: { position: "asc" }, select: { questionId: true } },
      _count: { select: { questions: true } },
    },
  });
  if (!test) throw new ExamError("Test topilmadi yoki sizga mavjud emas", "NOT_FOUND");

  const previous = await prisma.attempt.findMany({
    where: { testId, userId },
    orderBy: { attemptNo: "desc" },
  });
  const existing = previous.find((a) => a.status === "IN_PROGRESS");
  if (existing) {
    if (isExpired(existing.deadlineAt, now, SAVE_GRACE_MS)) {
      await finalizeAttempt(existing.id, { auto: true });
      throw new ExamError("Test vaqti tugagan, javoblaringiz avtomatik topshirildi", "EXPIRED");
    }
    return existing; // davom ettirish: muddat qayta boshlanmaydi
  }
  if (previous.length >= test.maxAttempts) {
    throw new ExamError(
      test.maxAttempts > 1 ? "Urinishlar soni tugagan" : "Siz bu testni allaqachon topshirgansiz",
      "ALREADY_SUBMITTED",
    );
  }

  if (testState(test, now) !== "open") {
    throw new ExamError("Test hozir topshirish uchun ochiq emas", "NOT_OPEN");
  }
  if (test._count.questions === 0) {
    throw new ExamError("Testda hali savollar yo'q", "NOT_OPEN");
  }

  const attemptNo = (previous[0]?.attemptNo ?? 0) + 1;
  try {
    return await prisma.attempt.create({
      data: {
        testId,
        userId,
        attemptNo,
        startedAt: now,
        deadlineAt: computeDeadline(test, now),
        questionIds: pickQuestionIds(test.questions.map((q) => q.questionId), test.questionsPerAttempt),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Parallel so'rov allaqachon yaratgan
      const again = await prisma.attempt.findFirst({ where: { testId, userId, status: "IN_PROGRESS" } });
      if (again) return again;
    }
    throw e;
  }
}

async function loadOwnAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, testId: true, status: true, deadlineAt: true, questionIds: true },
  });
  if (!attempt || attempt.userId !== userId) throw new ExamError("Urinish topilmadi", "NOT_FOUND");
  return attempt;
}

export async function saveAnswer(
  userId: string,
  input: { attemptId: string; questionId: string; selectedOptionIds: string[]; flagged: boolean },
) {
  const now = new Date();
  const attempt = await loadOwnAttempt(userId, input.attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    throw new ExamError("Test allaqachon topshirilgan", "ALREADY_SUBMITTED");
  }
  if (isExpired(attempt.deadlineAt, now, SAVE_GRACE_MS)) {
    await finalizeAttempt(attempt.id, { auto: true });
    throw new ExamError("Vaqt tugadi. Javoblaringiz avtomatik topshirildi", "EXPIRED");
  }

  const tq = await prisma.testQuestion.findUnique({
    where: { testId_questionId: { testId: attempt.testId, questionId: input.questionId } },
    select: { question: { select: { type: true, options: { select: { id: true } } } } },
  });
  if (!tq || (attempt.questionIds.length && !attempt.questionIds.includes(input.questionId))) {
    throw new ExamError("Savol bu testga tegishli emas", "INVALID");
  }
  if (
    !validateSelection(
      tq.question.type,
      input.selectedOptionIds,
      tq.question.options.map((o) => o.id),
    )
  ) {
    throw new ExamError("Javob formati noto'g'ri", "INVALID");
  }

  // Holat tekshiruvi va yozuv orasida yakunlanib qolmasligi uchun tranzaksiya ichida qayta tekshiramiz.
  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT "status" FROM "Attempt" WHERE "id" = ${attempt.id} FOR UPDATE`;
    if (locked[0]?.status !== "IN_PROGRESS") {
      throw new ExamError("Test allaqachon topshirilgan", "ALREADY_SUBMITTED");
    }
    await tx.answer.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId: input.questionId } },
      create: {
        attemptId: attempt.id,
        questionId: input.questionId,
        selectedOptionIds: input.selectedOptionIds,
        flagged: input.flagged,
      },
      update: { selectedOptionIds: input.selectedOptionIds, flagged: input.flagged },
    });
  });
  return { savedAt: new Date(), deadlineAt: attempt.deadlineAt };
}

export async function submitAttempt(userId: string, attemptId: string) {
  const attempt = await loadOwnAttempt(userId, attemptId);
  if (attempt.status !== "IN_PROGRESS") return { alreadyFinalized: true as const };
  const auto = isExpired(attempt.deadlineAt, new Date());
  return finalizeAttempt(attempt.id, { auto });
}

/**
 * Imtihon oynasi uchun ma'lumot. To'g'ri javob kalitlari HECH QACHON qaytarilmaydi.
 */
export async function getExamView(userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      questionIds: true,
      test: {
        select: {
          id: true,
          kind: true,
          title: true,
          subject: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
              points: true,
              question: {
                select: {
                  id: true,
                  text: true,
                  type: true,
                  options: { orderBy: { position: "asc" }, select: { id: true, text: true } },
                },
              },
            },
          },
        },
      },
      answers: { select: { questionId: true, selectedOptionIds: true, flagged: true } },
    },
  });
  if (!attempt || attempt.userId !== userId) return null;
  // Talabaga faqat unga tushgan savollar ko'rsatiladi
  if (attempt.questionIds.length) {
    const own = new Set(attempt.questionIds);
    attempt.test.questions = attempt.test.questions.filter((tq) => own.has(tq.question.id));
  }
  // Savollar tartibi har bir urinish uchun aralashtiriladi (sahifa yangilanganda tartib saqlanadi)
  attempt.test.questions = seededShuffle(attempt.test.questions, attempt.id);
  // Variantlar har bir talaba uchun aralashtiriladi (to'g'ri javob doim birinchi turmasligi uchun).
  for (const tq of attempt.test.questions) {
    if (tq.question.type !== "TRUE_FALSE") tq.question.options = seededShuffle(tq.question.options, attempt.id + tq.question.id);
  }
  return attempt;
}

/**
 * Testning topshirilgan barcha urinishlari ballini qayta hisoblaydi
 * (jami baho o'zgartirilganda). Javoblarning o'zi qayta baholanmaydi.
 */
export async function rescoreTest(testId: string) {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { maxScore: true, questions: { select: { questionId: true, points: true } } },
  });
  if (!test) return 0;
  const points = new Map(test.questions.map((q) => [q.questionId, q.points]));
  const attempts = await prisma.attempt.findMany({
    where: { testId, status: "SUBMITTED" },
    select: { id: true, questionIds: true, answers: { select: { pointsAwarded: true } } },
  });
  for (const a of attempts) {
    const ids = a.questionIds.length ? a.questionIds : [...points.keys()];
    const rawMax = ids.reduce((n, id) => n + (points.get(id) ?? 0), 0);
    const raw = a.answers.reduce((n, x) => n + (x.pointsAwarded ?? 0), 0);
    const scaled = scaleScore(raw, rawMax, test.maxScore);
    await prisma.attempt.update({ where: { id: a.id }, data: { score: scaled.score, maxScore: scaled.maxScore } });
  }
  return attempts.length;
}

/** Davomiylik yoki tugash vaqti o'zgarganda jarayondagi urinishlar muddatini moslaydi. */
export async function recomputeDeadlines(testId: string) {
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { isPublished: true, startsAt: true, endsAt: true, durationMinutes: true } });
  if (!test) return;
  const open = await prisma.attempt.findMany({ where: { testId, status: "IN_PROGRESS" }, select: { id: true, startedAt: true } });
  for (const a of open) {
    await prisma.attempt.update({ where: { id: a.id }, data: { deadlineAt: computeDeadline(test, a.startedAt) } });
  }
}

/** Talaba imtihon oynasi uchun: urinish holati va (o'zgargan bo'lishi mumkin) muddati. */
export async function getAttemptStatus(userId: string, attemptId: string) {
  const a = await loadOwnAttempt(userId, attemptId);
  return { status: a.status, deadlineAt: a.deadlineAt };
}

/** Hozir testni ishlayotgan (muddati tugamagan) talabalar. */
export async function liveAttempts(testId: string) {
  const now = new Date();
  return prisma.attempt.findMany({
    where: { testId, status: "IN_PROGRESS", deadlineAt: { gt: now } },
    orderBy: { startedAt: "asc" },
    select: { id: true, user: { select: { fullName: true } } },
  });
}

/** Ochiq testni muddatidan oldin yakunlaydi: jarayondagi urinishlar saqlangan javoblar bilan topshiriladi. */
export async function endTestNow(testId: string) {
  const now = new Date();
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { startsAt: true, endsAt: true } });
  if (!test) throw new ExamError("Test topilmadi", "NOT_FOUND");
  if (test.endsAt <= now) throw new ExamError("Test allaqachon yakunlangan", "NOT_OPEN");
  // Hali boshlanmagan bo'lsa, oraliq bo'sh bo'lmasligi uchun boshlanishni ham hozirga suramiz
  await prisma.test.update({
    where: { id: testId },
    data: { endsAt: now, ...(test.startsAt > now ? { startsAt: now } : {}) },
  });
  await recomputeDeadlines(testId);
  const open = await prisma.attempt.findMany({ where: { testId, status: "IN_PROGRESS" }, select: { id: true } });
  for (const a of open) await finalizeAttempt(a.id, { auto: true, now });
  return open.length;
}

/* ===================== Imtihon nazorati ===================== */

/**
 * Test qaysi sessiyada (qurilmada) ishlanayotganini kuzatadi.
 * Boshqa sessiyadan ochilsa yoki javob yuborilsa — qurilma almashgani qayd etiladi.
 * Qaytaradi: true — shu safar boshqa qurilma aniqlandi.
 */
export async function trackAttemptDevice(attemptId: string, userId: string, sessionId: string): Promise<boolean> {
  const a = await prisma.attempt.findFirst({ where: { id: attemptId, userId, status: "IN_PROGRESS" }, select: { sessionId: true } });
  if (!a || a.sessionId === sessionId) return false;
  if (!a.sessionId) {
    await prisma.attempt.update({ where: { id: attemptId }, data: { sessionId } });
    return false;
  }
  await prisma.attempt.update({ where: { id: attemptId }, data: { sessionId, deviceChanges: { increment: 1 } } });
  return true;
}

const EVENT_CAP = 1000;

/** Imtihon paytidagi shubhali harakatni qayd etadi: boshqa oynaga o'tish yoki nusxa olish. */
export async function recordExamEvent(attemptId: string, userId: string, kind: "tab" | "copy") {
  const field = kind === "tab" ? "tabSwitches" : "copyEvents";
  await prisma.attempt.updateMany({
    where: { id: attemptId, userId, status: "IN_PROGRESS", [field]: { lt: EVENT_CAP } },
    data: { [field]: { increment: 1 } },
  });
}
