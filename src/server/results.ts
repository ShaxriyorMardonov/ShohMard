import "server-only";
import type { Prisma } from "@prisma/client";

export type ResultFilters = { test?: string; university?: string; q?: string };

export function resultsWhere(f: ResultFilters): Prisma.AttemptWhereInput {
  const q = (f.q ?? "").trim().slice(0, 100);
  return {
    status: "SUBMITTED",
    ...(f.test ? { testId: f.test } : {}),
    user: {
      ...(f.university ? { universityId: f.university } : {}),
      ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { login: { contains: q, mode: "insensitive" } }] } : {}),
    },
  };
}

export const resultSelect = {
  id: true,
  startedAt: true,
  submittedAt: true,
  autoSubmitted: true,
  score: true,
  maxScore: true,
  percent: true,
  correctCount: true,
  totalQuestions: true,
  user: { select: { fullName: true, login: true, groupName: true, university: { select: { name: true, shortName: true } } } },
  test: { select: { id: true, title: true, subject: true, passingPercent: true } },
} satisfies Prisma.AttemptSelect;
