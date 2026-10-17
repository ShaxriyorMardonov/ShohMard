"use server";

import { redirect } from "next/navigation";
import { requireExaminee } from "@/lib/auth";
import { saveAnswerSchema } from "@/lib/validation";
import { ExamError, getAttemptStatus, recordExamEvent, saveAnswer, startAttempt, submitAttempt, trackAttemptDevice } from "@/server/exam";

export type ExamActionResult =
  | { ok: true; serverNow: string }
  | { ok: false; error: string; code: ExamError["code"] | "UNKNOWN"; serverNow: string };

function fail(e: unknown): ExamActionResult {
  if (e instanceof ExamError) return { ok: false, error: e.message, code: e.code, serverNow: new Date().toISOString() };
  console.error(e);
  return { ok: false, error: "Server xatosi. Qayta urinib ko'ring.", code: "UNKNOWN", serverNow: new Date().toISOString() };
}

export async function startAttemptAction(testId: string): Promise<{ error: string } | void> {
  const user = await requireExaminee();
  let attemptId: string;
  try {
    const attempt = await startAttempt(user.id, user.university?.id ?? null, String(testId));
    attemptId = attempt.id;
  } catch (e) {
    if (e instanceof ExamError) return { error: e.message };
    throw e;
  }
  redirect(`/exam/${attemptId}`);
}

export async function saveAnswerAction(input: unknown): Promise<ExamActionResult> {
  const user = await requireExaminee();
  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Noto'g'ri so'rov", code: "INVALID", serverNow: new Date().toISOString() };
  }
  try {
    await saveAnswer(user.id, parsed.data);
    await trackAttemptDevice(parsed.data.attemptId, user.id, user.sessionId);
    return { ok: true, serverNow: new Date().toISOString() };
  } catch (e) {
    return fail(e);
  }
}

export async function submitAttemptAction(attemptId: string): Promise<ExamActionResult> {
  const user = await requireExaminee();
  try {
    await submitAttempt(user.id, String(attemptId));
    return { ok: true, serverNow: new Date().toISOString() };
  } catch (e) {
    return fail(e);
  }
}

/** Imtihon oynasi vaqti-vaqti bilan so'raydi: muddat o'zgargan yoki test yakunlangan bo'lsa bilib oladi. */
export async function examStatusAction(attemptId: string): Promise<{ status?: "IN_PROGRESS" | "SUBMITTED"; deadlineAt?: string; serverNow: string }> {
  const user = await requireExaminee();
  try {
    const s = await getAttemptStatus(user.id, String(attemptId));
    return { status: s.status, deadlineAt: s.deadlineAt.toISOString(), serverNow: new Date().toISOString() };
  } catch {
    return { serverNow: new Date().toISOString() };
  }
}

/** Shubhali harakat (boshqa oynaga o'tish, nusxa olish) — natijalarda o'qituvchiga ko'rsatiladi. */
export async function reportExamEventAction(attemptId: string, kind: "tab" | "copy"): Promise<void> {
  const user = await requireExaminee();
  if (kind !== "tab" && kind !== "copy") return;
  await recordExamEvent(String(attemptId), user.id, kind);
}
