"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { canManageTest } from "@/server/org";
import { prisma } from "@/lib/db";
import { parseQuestionText, type ParseIssue } from "@/lib/question-text-parser";
import { extractWordText, importQuestions, importStudents, importUniversities, saveQuestions, type ImportResult } from "@/server/import";
import { getT } from "@/i18n/server";

type Kind = "universities" | "students" | "questions";

export async function importAction(kind: Kind, testId: string | null, _prev: ImportResult | null, fd: FormData): Promise<ImportResult> {
  const staff = await requireStaff();
  // Menejer: faqat o'z universitetiga talaba va o'z testiga savol yuklay oladi
  if (staff.scope && (kind === "universities" || (kind === "questions" && !testId))) {
    return { ok: false, message: "Bu amal uchun ruxsat yo'q" };
  }
  if (kind === "questions" && testId && !(await canManageTest(staff.scope, testId))) {
    return { ok: false, message: "Test topilmadi" };
  }
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Faylni tanlang" };
  try {
    let res: ImportResult;
    if (kind === "universities") res = await importUniversities(file);
    else if (kind === "students") res = await importStudents(file, staff.scope);
    else res = await importQuestions(file, testId ?? undefined);
    if (res.ok) {
      revalidatePath("/admin", "layout");
    }
    return res;
  } catch (e) {
    if (e instanceof Error && !("code" in e)) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Faylni yuklashda xatolik yuz berdi" };
  }
}

/** Word fayldan matnni ajratib beradi: foydalanuvchi uni platformada ko'rib, tuzatib, so'ng yuklaydi. */
export async function extractQuestionsFileAction(fd: FormData): Promise<{ text?: string; error?: string }> {
  await requireStaff();
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Faylni tanlang" };
  try {
    const res = await extractWordText(file);
    return "error" in res ? { error: res.error } : { text: res.text.slice(0, 2_000_000) };
  } catch (e) {
    if (e instanceof Error) return { error: e.message };
    return { error: "Faylni yuklashda xatolik yuz berdi" };
  }
}

/** Platformada tahrirlangan savollar matnini testga yuklaydi. */
export async function importQuestionsTextAction(
  testId: string,
  text: string,
): Promise<{ ok?: boolean; created?: number; error?: string; issues?: ParseIssue[] }> {
  const staff = await requireStaff();
  if (!(await canManageTest(staff.scope, testId))) return { error: "Test topilmadi" };
  const test = await prisma.test.findUnique({ where: { id: testId }, select: { _count: { select: { attempts: true } } } });
  if (!test) return { error: "Test topilmadi" };
  if (test._count.attempts > 0) return { error: "Test boshlangan, savollar qo'shib bo'lmaydi" };
  const { t } = await getT();
  const parsed = parseQuestionText(String(text ?? "").slice(0, 2_000_000), t);
  if (parsed.issues.length) return { error: "Matnda xatolar bor. Avval ularni tuzating.", issues: parsed.issues.slice(0, 200) };
  if (parsed.questions.length > 1000) return { error: "Bir martada ko'pi bilan 1000 ta savol" };
  await saveQuestions(parsed.questions, testId);
  revalidatePath(`/admin/tests/${testId}`);
  revalidatePath("/admin/questions");
  return { ok: true, created: parsed.questions.length };
}
