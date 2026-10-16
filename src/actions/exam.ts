"use server";

import { redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { saveAnswerSchema } from "@/lib/validation";
import { ExamError, getAttemptStatus, saveAnswer, startAttempt, submitAttempt } from "@/server/exam";

export type ExamActionResult =
  | { ok: true; serverNow: string }
  | { ok: false; error: string; code: ExamError["code"] | "UNKNOWN"; serverNow: string };

function fail(e: unknown): ExamActionResult {
  if (e instanceof ExamError) return { ok: false, error: e.message, code: e.code, serverNow: new Date().toISOString() };
  console.error(e);
  return { ok: false, error: "Server xatosi. Qayta urinib ko'ring.", code: "UNKNOWN", serverNow: new Date().toISOString() };
}

export async function startAttemptAction(testId: string): Promise<{ error: string } | void> {
  const user = await requireStudent();
  let attemptId: string;
  try {
    const attempt = await startAttempt(user.id, user.university.id, String(testId));
    attemptId = attempt.id;
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    throw e;
  }
  redirect(`/exam/${attemptId}`);
}

export async function saveAnswerAction(input: unknown): Promise<ExamActionResult> {
  const user = await requireStudent();
  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Noto'g'ri so'rov", code: "INVALID", serverNow: new Date().toISOString() };
  }
  try {
    await saveAnswer(user.id, parsed.data);
    return { ok: true, serverNow: new Date().toISOString() };
  } catch (e) {
    return fail(e);
  }
}

export async function submitAttemptAction(attemptId: string): Promise<ExamActionResult> {
  const user = await requireStudent();
  try {
    await submitAttempt(user.id, String(attemptId));
    return { ok: true, serverNow: new Date().toISOString() };
  } catch (e) {
    return fail(e);
  }
}

/** Imtihon oynasi vaqti-vaqti bilan so'raydi: muddat o'zgargan yoki test yakunlangan bo'lsa bilib oladi. */
export async function examStatusAction(attemptId: string): Promise<{ status?: "IN_PROGRESS" | "SUBMITTED"; deadlineAt?: string; serverNow: string }> {
  const user = await requireStudent();
  try {
    const s = await getAttemptStatus(user.id, String(attemptId));
    return { status: s.status, deadlineAt: s.deadlineAt.toISOString(), serverNow: new Date().toISOString() };
  } catch {
    return { serverNow: new Date().toISOString() };
  }
}
