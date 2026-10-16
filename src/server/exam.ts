import "server-only";
import { seededShuffle } from "@/lib/shuffle";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  SAVE_GRACE_MS,
  computeDeadline,
  gradeAttempt,
  isExpired,
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

/** Talaba universitetiga biriktirilgan va nashr etilgan testlar sharti. */
export function studentTestWhere(universityId: string): Prisma.TestWhereInput {
  return { isPublished: true, universities: { some: { id: universityId } } };
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
      select: { id: true, status: true, testId: true, deadlineAt: true },
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
      where: { testId: attempt.testId },
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

    await tx.attempt.update({
      where: { id: attemptId },
      data: {
        score: result.score,
        maxScore: result.maxScore,
        percent: result.percent,
        correctCount: result.correctCount,
        totalQuestions: questions.length,
      },
    });
    return { alreadyFinalized: false as const, ...result };
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

export async function startAttempt(userId: string, universityId: string, testId: string) {
  const now = new Date();
  const test = await prisma.test.findFirst({
    where: { id: testId, ...studentTestWhere(universityId) },
    select: {
      id: true,
      isPublished: true,
      startsAt: true,
      endsAt: true,
      durationMinutes: true,
      _count: { select: { questions: true } },
    },
  });
  if (!test) throw new ExamError("Test topilmadi yoki sizga mavjud emas", "NOT_FOUND");

  const existing = await prisma.attempt.findUnique({
    where: { testId_userId: { testId, userId } },
  });
  if (existing) {
    if (existing.status === "SUBMITTED") {
      throw new ExamError("Siz bu testni allaqachon topshirgansiz", "ALREADY_SUBMITTED");
    }
    if (isExpired(existing.deadlineAt, now, SAVE_GRACE_MS)) {
      await finalizeAttempt(existing.id, { auto: true });
      throw new ExamError("Test vaqti tugagan, javoblaringiz avtomatik topshirildi", "EXPIRED");
    }
    return existing; // davom ettirish: muddat qayta boshlanmaydi
  }

  if (testState(test, now) !== "open") {
    throw new ExamError("Test hozir topshirish uchun ochiq emas", "NOT_OPEN");
  }
  if (test._count.questions === 0) {
    throw new ExamError("Testda hali savollar yo'q", "NOT_OPEN");
  }

  try {
    return await prisma.attempt.create({
      data: { testId, userId, startedAt: now, deadlineAt: computeDeadline(test, now) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Parallel so'rov allaqachon yaratgan
      const again = await prisma.attempt.findUnique({ where: { testId_userId: { testId, userId } } });
      if (again) return again;
    }
    throw e;
  }
}

async function loadOwnAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: { id: true, userId: true, testId: true, status: true, deadlineAt: true },
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
  if (!tq) throw new ExamError("Savol bu testga tegishli emas", "INVALID");
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
      test: {
        select: {
          id: true,
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
  // Variantlar har bir talaba uchun aralashtiriladi (to'g'ri javob doim birinchi turmasligi uchun).
  for (const tq of attempt.test.questions) {
    if (tq.question.type !== "TRUE_FALSE") tq.question.options = seededShuffle(tq.question.options, attempt.id + tq.question.id);
  }
  return attempt;
}
