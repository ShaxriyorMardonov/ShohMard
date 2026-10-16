"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { canManageTest } from "@/server/org";
import { importQuestions, importStudents, importUniversities, type ImportResult } from "@/server/import";

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
