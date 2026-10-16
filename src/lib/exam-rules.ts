import type { QuestionType, ResultRelease } from "@prisma/client";

/** Saqlash so'rovlari tarmoq kechikishi uchun muddatdan keyin qabul qilinadigan oraliq. */
export const SAVE_GRACE_MS = 3_000;

export type TestWindow = {
  isPublished: boolean;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
};

export type TestState = "draft" | "upcoming" | "open" | "closed";

export function testState(test: TestWindow, now: Date): TestState {
  if (!test.isPublished) return "draft";
  if (now < test.startsAt) return "upcoming";
  if (now >= test.endsAt) return "closed";
  return "open";
}

/** Server muddati: boshlanish + davomiylik, lekin test oynasi yopilishidan oshmaydi. */
export function computeDeadline(test: TestWindow, startedAt: Date): Date {
  const byDuration = startedAt.getTime() + test.durationMinutes * 60_000;
  return new Date(Math.min(byDuration, test.endsAt.getTime()));
}

export function isExpired(deadlineAt: Date, now: Date, graceMs = 0): boolean {
  return now.getTime() > deadlineAt.getTime() + graceMs;
}

export type ReleaseInfo = {
  resultRelease: ResultRelease;
  endsAt: Date;
  resultsReleasedAt: Date | null;
};

export function isResultReleased(test: ReleaseInfo, now: Date): boolean {
  switch (test.resultRelease) {
    case "IMMEDIATE":
      return true;
    case "AFTER_END":
      return now >= test.endsAt;
    case "MANUAL":
      return test.resultsReleasedAt !== null && test.resultsReleasedAt <= now;
  }
}

/** Natija e'lon qilinadigan vaqt (ma'lum bo'lsa). */
export function releaseTime(test: ReleaseInfo): Date | null {
  if (test.resultRelease === "IMMEDIATE") return null;
  if (test.resultRelease === "AFTER_END") return test.endsAt;
  return test.resultsReleasedAt;
}

/**
 * To'liq moslik bo'yicha baholash: tanlangan variantlar to'plami
 * to'g'ri variantlar to'plamiga aynan teng bo'lsagina to'g'ri hisoblanadi.
 */
export function isAnswerCorrect(selected: readonly string[], correct: readonly string[]): boolean {
  if (correct.length === 0) return false;
  const s = new Set(selected);
  if (s.size !== selected.length || s.size !== correct.length) return false;
  return correct.every((id) => s.has(id));
}

export type GradeQuestion = {
  questionId: string;
  points: number;
  correctOptionIds: string[];
};

export type GradeResult = {
  perQuestion: Map<string, { isCorrect: boolean; points: number }>;
  score: number;
  maxScore: number;
  correctCount: number;
  percent: number;
};

export function gradeAttempt(
  questions: readonly GradeQuestion[],
  answers: ReadonlyMap<string, readonly string[]>,
): GradeResult {
  const perQuestion = new Map<string, { isCorrect: boolean; points: number }>();
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  for (const q of questions) {
    maxScore += q.points;
    const ok = isAnswerCorrect(answers.get(q.questionId) ?? [], q.correctOptionIds);
    const pts = ok ? q.points : 0;
    perQuestion.set(q.questionId, { isCorrect: ok, points: pts });
    score += pts;
    if (ok) correctCount += 1;
  }
  const percent = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0;
  return { perQuestion, score, maxScore, correctCount, percent };
}

/** Javob tuzilishini savol turiga qarab tekshiradi. */
export function validateSelection(
  type: QuestionType,
  selected: readonly string[],
  allowedOptionIds: readonly string[],
): boolean {
  const allowed = new Set(allowedOptionIds);
  if (new Set(selected).size !== selected.length) return false;
  if (!selected.every((id) => allowed.has(id))) return false;
  if ((type === "SINGLE" || type === "TRUE_FALSE") && selected.length > 1) return false;
  return true;
}

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: "Bitta javobli",
  MULTIPLE: "Ko'p javobli",
  TRUE_FALSE: "To'g'ri / Noto'g'ri",
};

export const RESULT_RELEASE_LABEL: Record<ResultRelease, string> = {
  IMMEDIATE: "Topshirilgandan so'ng darhol",
  AFTER_END: "Test yakunlangach",
  MANUAL: "Administrator e'lon qilganda",
};

/** Xom ballni testning jami bahosiga moslaydi (0,1 aniqlikda). */
export function scaleScore(score: number, rawMax: number, maxScore: number | null | undefined): { score: number; maxScore: number } {
  if (!maxScore || rawMax <= 0) return { score, maxScore: rawMax };
  return { score: Math.round((score / rawMax) * maxScore * 10) / 10, maxScore };
}

/** Talabaga tushadigan savollar: soni berilgan bo'lsa, tasodifiy tanlanadi (test tartibi saqlanadi). */
export function pickQuestionIds(ordered: readonly string[], count: number | null | undefined, rand: () => number = Math.random): string[] {
  if (!count || count >= ordered.length) return [];
  const idx = ordered.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  const chosen = new Set(idx.slice(0, count));
  return ordered.filter((_, i) => chosen.has(i));
}
