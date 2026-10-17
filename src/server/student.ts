import "server-only";
import { prisma } from "@/lib/db";
import { isExpired, isResultReleased, testState, SAVE_GRACE_MS } from "@/lib/exam-rules";
import type { Prisma } from "@prisma/client";
import { finalizeExpiredAttempts, olympiadTestWhere, studentTestWhere } from "./exam";
import { OLYMPIAD_KINDS, type OlympiadKind } from "@/lib/olympiad";

export type StudentTestStatus = "in_progress" | "submitted" | "open" | "upcoming" | "missed";

/** Talabaning universitetiga tegishli testlar va ularning talaba uchun holati. */
export async function getStudentTests(userId: string, universityId: string) {
  return getExamineeTests(userId, studentTestWhere(userId, universityId));
}

/** Faol olimpiadalar (talaba va ishtirokchi uchun bir xil). */
export async function getOlympiadTests(userId: string, kind?: OlympiadKind) {
  return getExamineeTests(userId, olympiadTestWhere(kind));
}

async function getExamineeTests(userId: string, where: Prisma.TestWhereInput) {
  await finalizeExpiredAttempts({ userId });
  const now = new Date();
  const tests = await prisma.test.findMany({
    where,
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      kind: true,
      questionsPerAttempt: true,
      title: true,
      subject: true,
      description: true,
      durationMinutes: true,
      startsAt: true,
      endsAt: true,
      isPublished: true,
      resultRelease: true,
      resultsReleasedAt: true,
      maxAttempts: true,
      _count: { select: { questions: true } },
      attempts: {
        where: { userId },
        orderBy: { attemptNo: "desc" },
        select: { id: true, status: true, deadlineAt: true, submittedAt: true, percent: true },
      },
    },
  });
  return tests.map((t) => {
    const attempt = t.attempts[0] ?? null;
    const attemptsUsed = t.attempts.length;
    const attemptsLeft = Math.max(0, t.maxAttempts - attemptsUsed);
    const state = testState(t, now);
    let status: StudentTestStatus;
    if (attempt?.status === "IN_PROGRESS" && !isExpired(attempt.deadlineAt, now, SAVE_GRACE_MS)) status = "in_progress";
    else if (attempt && (attemptsLeft === 0 || state !== "open")) status = "submitted";
    else if (state === "open") status = "open";
    else if (state === "upcoming") status = "upcoming";
    else status = "missed";
    const { attempts: _a, ...rest } = t;
    void _a;
    return { ...rest, attempt, attemptsUsed, attemptsLeft, status, released: isResultReleased(t, now) };
  });
}

export type StudentTest = Awaited<ReturnType<typeof getStudentTests>>[number];

export async function getStudentAttempts(userId: string, olympiad = false) {
  await finalizeExpiredAttempts({ userId });
  const now = new Date();
  const attempts = await prisma.attempt.findMany({
    // Olimpiada natijalari umumiy natijalardan alohida
    where: { userId, test: { kind: olympiad ? { in: OLYMPIAD_KINDS } : "REGULAR" } },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      deadlineAt: true,
      autoSubmitted: true,
      score: true,
      maxScore: true,
      percent: true,
      correctCount: true,
      totalQuestions: true,
      test: {
        select: {
          id: true,
          kind: true,
          title: true,
          subject: true,
          passingPercent: true,
          resultRelease: true,
          endsAt: true,
          resultsReleasedAt: true,
        },
      },
    },
  });
  return attempts.map((a) => {
    const released = a.status === "SUBMITTED" && isResultReleased(a.test, now);
    // E'lon qilinmagan natijalar talabaga yuborilmaydi
    return released
      ? { ...a, released }
      : { ...a, released, score: null, maxScore: null, percent: null, correctCount: null };
  });
}

export type StudentAttempt = Awaited<ReturnType<typeof getStudentAttempts>>[number];
