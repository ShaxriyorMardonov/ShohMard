import "server-only";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import type { QuestionType, StudyForm } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseQuestionText, type ParsedQuestion } from "@/lib/question-text-parser";
import { parseStudyForm } from "@/lib/labels";
import { pinflField } from "@/lib/validation";
import { generateInitialPassword, generateStudentLogins, hashInitialPassword } from "@/server/student-account";
import { resolveFacultyGroup } from "@/server/org";
import { getT } from "@/i18n/server";
import type { TFunction } from "@/i18n/translate";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ImportResult = {
  ok: boolean;
  created?: number;
  skipped?: number;
  message?: string;
  errors?: string[];
  /** Yangi yaratilgan talaba hisoblari (login avtomatik beriladi). */
  accounts?: { fullName: string; login: string; password: string }[];
};

/** Birinchi varaqni o'qiydi: sarlavha qatori + ma'lumot qatorlari (matn ko'rinishida). */
function checkSize(file: File) {
  if (file.size === 0) throw new Error("Fayl bo'sh");
  if (file.size > MAX_FILE_BYTES) throw new Error("Fayl hajmi 5 MB dan oshmasligi kerak");
}

export async function readSheet(file: File): Promise<{ header: string[]; rows: { line: number; cells: string[] }[] }> {
  checkSize(file);
  if (!/\.xlsx$/i.test(file.name)) throw new Error("Faqat .xlsx (Excel) fayl yuklash mumkin");
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("Faylni o'qib bo'lmadi. U Excel (.xlsx) formatida ekanini tekshiring");
  }
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("Faylda varaq topilmadi");
  const width = ws.columnCount;
  const text = (row: ExcelJS.Row) =>
    Array.from({ length: width }, (_, i) => row.getCell(i + 1).text?.toString().trim() ?? "");
  const header = text(ws.getRow(1)).map((h) => h.toLowerCase());
  const rows: { line: number; cells: string[] }[] = [];
  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const cells = text(row);
    if (cells.some((c) => c !== "")) rows.push({ line: n, cells });
  });
  if (rows.length === 0) throw new Error("Faylda ma'lumot qatorlari yo'q (1-qator sarlavha bo'lishi kerak)");
  return { header, rows };
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[ʻʼ'`’‘]/g, "").replace(/\s+/g, " ").trim();

/* ===================== Universitetlar ===================== */
// Ustunlar: Nomi | Qisqa nomi | Shahar
export async function importUniversities(file: File): Promise<ImportResult> {
  const { t } = await getT();
  const { rows } = await readSheet(file);
  if (rows.length > 500) return { ok: false, message: "Bir martada ko'pi bilan 500 ta universitet" };
  const errors: string[] = [];
  const data: { name: string; shortName: string; city: string | null }[] = [];
  const seen = new Set<string>();
  for (const { line, cells } of rows) {
    const [name = "", shortName = "", city = ""] = cells;
    if (name.length < 3) errors.push(t("{line}-qator: universitet nomi kamida 3 belgi bo'lsin", { line }));
    else if (!shortName) errors.push(t("{line}-qator: qisqa nomi kiritilmagan", { line }));
    else if (name.length > 160 || shortName.length > 20) errors.push(t("{line}-qator: nom juda uzun", { line }));
    else if (seen.has(norm(name))) errors.push(t('{line}-qator: "{name}" faylda takrorlangan', { line, name }));
    else {
      seen.add(norm(name));
      data.push({ name, shortName, city: city || null });
    }
  }
  if (errors.length) return { ok: false, errors };
  const existing = new Set((await prisma.university.findMany({ select: { name: true } })).map((u) => norm(u.name)));
  const fresh = data.filter((d) => !existing.has(norm(d.name)));
  await prisma.university.createMany({ data: fresh, skipDuplicates: true });
  return { ok: true, created: fresh.length, skipped: data.length - fresh.length };
}

/* ===================== Talabalar ===================== */
// Ustunlar: F.I.Sh. | JShShIR | Universitet | Fakultet | Guruh | Ta'lim shakli
// Ustunlar sarlavha bo'yicha topiladi; sarlavha tanilmasa, shu tartibda deb olinadi.
// Login (7 xonali raqam) va boshlang'ich parol avtomatik beriladi.
const STUDENT_COLS: { key: string; match: (h: string) => boolean }[] = [
  { key: "fullName", match: (h) => h.includes("f.i") || h.includes("fio") || h.includes("ism") },
  { key: "pinfl", match: (h) => h.includes("jshshir") || h.includes("jshir") || h.includes("pinfl") || h.includes("shaxsiy") },
  { key: "university", match: (h) => h.startsWith("universitet") || h.startsWith("oliy") },
  { key: "faculty", match: (h) => h.startsWith("fakultet") },
  { key: "group", match: (h) => h.startsWith("guruh") },
  { key: "studyForm", match: (h) => h.includes("shakl") },
];

function columnMap(header: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  header.forEach((h, i) => {
    const n = norm(h);
    const c = STUDENT_COLS.find((c) => !(c.key in map) && c.match(n));
    if (c) map[c.key] = i;
  });
  if (Object.keys(map).length < 3) STUDENT_COLS.forEach((c, i) => (map[c.key] = i));
  return map;
}

export async function importStudents(file: File, scope: string | null = null): Promise<ImportResult> {
  const { t } = await getT();
  const { header, rows } = await readSheet(file);
  if (rows.length > 1000) return { ok: false, message: "Bir martada ko'pi bilan 1000 ta talaba yuklash mumkin" };
  const col = columnMap(header);
  if (col.pinfl === undefined) return { ok: false, message: "Faylda JShShIR ustuni topilmadi" };
  const get = (cells: string[], key: string) => (col[key] === undefined ? "" : (cells[col[key]!] ?? "").trim());
  const unis = await prisma.university.findMany({
    where: scope ? { id: scope } : {},
    select: { id: true, name: true, shortName: true },
  });
  const uniBy = new Map<string, string>();
  for (const u of unis) {
    uniBy.set(norm(u.name), u.id);
    uniBy.set(norm(u.shortName), u.id);
  }
  const errors: string[] = [];
  type Row = { line: number; fullName: string; pinfl: string; universityId: string; faculty: string; group: string; studyForm: StudyForm | null };
  const data: Row[] = [];
  const seen = new Map<string, number>();
  for (const { line, cells } of rows) {
    const fullName = get(cells, "fullName");
    const uni = get(cells, "university");
    const pf = pinflField.safeParse(get(cells, "pinfl"));
    const universityId = scope ?? uniBy.get(norm(uni));
    const studyForm = parseStudyForm(get(cells, "studyForm"));
    if (fullName.length < 3) errors.push(t("{line}-qator: F.I.Sh. kiritilmagan", { line }));
    else if (!pf.success) errors.push(t("{line}-qator: JShShIR — {error}", { line, error: t(pf.error.issues[0]?.message ?? "") }));
    else if (!universityId) errors.push(t('{line}-qator: "{university}" universiteti topilmadi', { line, university: uni }));
    else if (studyForm === undefined) errors.push(t("{line}-qator: ta'lim shakli Kunduzgi, Sirtqi, Kechki yoki Masofaviy bo'lishi kerak", { line }));
    else if (seen.has(pf.data)) errors.push(t("{line}-qator: JShShIR {pinfl} faylda takrorlangan ({first}-qator bilan)", { line, pinfl: pf.data, first: seen.get(pf.data)! }));
    else {
      seen.set(pf.data, line);
      data.push({
        line,
        fullName: fullName.slice(0, 120),
        pinfl: pf.data,
        universityId,
        faculty: get(cells, "faculty").slice(0, 120),
        group: get(cells, "group").slice(0, 40),
        studyForm,
      });
    }
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 50) };
  // Bazada shu JShShIR bilan talaba bo'lsa, u qayta qo'shilmaydi
  const existing = await prisma.user.findMany({ where: { pinfl: { in: data.map((d) => d.pinfl) } }, select: { pinfl: true, fullName: true } });
  const existingBy = new Map(existing.map((u) => [u.pinfl!, u.fullName]));
  const skippedRows = data.filter((d) => existingBy.has(d.pinfl));
  const fresh = data.filter((d) => !existingBy.has(d.pinfl));
  const logins = await generateStudentLogins(fresh.length);
  // Har bir talabaga alohida tasodifiy boshlang'ich parol
  const passwords = fresh.map(() => generateInitialPassword());
  const hashes: string[] = [];
  for (const pw of passwords) hashes.push(await hashInitialPassword(pw));
  const orgCache = new Map<string, { facultyId: string | null; groupId: string | null }>();
  const prepared = [];
  for (const [i, d] of fresh.entries()) {
    const key = `${d.universityId}|${norm(d.faculty)}|${norm(d.group)}`;
    let org = orgCache.get(key);
    if (!org) {
      org = await resolveFacultyGroup(d.universityId, d.faculty, d.group);
      orgCache.set(key, org);
    }
    prepared.push({
      fullName: d.fullName,
      login: logins[i]!,
      pinfl: d.pinfl,
      universityId: d.universityId,
      ...org,
      studyForm: d.studyForm,
      role: "STUDENT" as const,
      passwordHash: hashes[i]!,
      mustChangePassword: true,
      initialPasswordAt: new Date(),
    });
  }
  if (prepared.length) await prisma.user.createMany({ data: prepared });
  return {
    ok: true,
    created: prepared.length,
    skipped: skippedRows.length,
    errors: skippedRows.slice(0, 50).map((d) =>
      t("{line}-qator: JShShIR {pinfl} bilan talaba allaqachon mavjud ({name}), qayta qo'shilmadi", { line: d.line, pinfl: d.pinfl, name: existingBy.get(d.pinfl)! }),
    ),
    accounts: prepared.map((p, i) => ({ fullName: p.fullName, login: p.login, password: passwords[i]! })),
  };
}

/* ===================== Savollar ===================== */
// Ustunlar: Savol | Turi | Fan | A | B | C | D | E | F | To'g'ri javob | Izoh
const LETTERS = ["A", "B", "C", "D", "E", "F"];

function parseType(raw: string): QuestionType | null {
  const t = norm(raw);
  if (!t || t.startsWith("bitta") || t === "single") return "SINGLE";
  if (t.startsWith("kop") || t.startsWith("bir nechta") || t === "multiple") return "MULTIPLE";
  if (t.includes("togri") || t.includes("notogri") || t === "true_false" || t === "tf") return "TRUE_FALSE";
  return null;
}

/** Word (.doc, .docx) fayldan oddiy matnni ajratib oladi. */
export async function extractWordText(file: File): Promise<{ text: string } | { error: string }> {
  checkSize(file);
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    if (/\.docx$/i.test(file.name)) return { text: (await mammoth.extractRawText({ buffer: buf })).value.replace(/\r\n?/g, "\n") };
    if (/\.doc$/i.test(file.name)) return { text: (await new WordExtractor().extract(buf)).getBody().replace(/\r\n?/g, "\n") };
  } catch {
    return { error: "Word faylni o'qib bo'lmadi. U .doc yoki .docx formatida ekanini tekshiring" };
  }
  return { error: "Word (.doc, .docx) fayl yuklang" };
}

export async function importQuestions(file: File, testId?: string): Promise<ImportResult> {
  const { t } = await getT();
  if (testId) {
    const test = await prisma.test.findUnique({ where: { id: testId }, select: { _count: { select: { attempts: true } } } });
    if (!test) return { ok: false, message: "Test topilmadi" };
    if (test._count.attempts > 0) return { ok: false, message: "Test boshlangan, savollar qo'shib bo'lmaydi" };
  }
  let parsed: { questions: ParsedQuestion[]; errors: string[] };
  if (/\.docx?$/i.test(file.name)) {
    const res = await extractWordText(file);
    if ("error" in res) return { ok: false, message: res.error };
    parsed = parseQuestionText(res.text, t);
  } else if (/\.xlsx$/i.test(file.name)) {
    parsed = parseQuestionSheet(await readSheet(file), t);
  } else {
    return { ok: false, message: "Savollar uchun Word (.doc, .docx) yoki Excel (.xlsx) fayl yuklang" };
  }
  if (parsed.errors.length) return { ok: false, errors: parsed.errors.slice(0, 50) };
  if (parsed.questions.length > 1000) return { ok: false, message: "Bir martada ko'pi bilan 1000 ta savol" };
  await saveQuestions(parsed.questions, testId);
  return { ok: true, created: parsed.questions.length };
}

function parseQuestionSheet({ rows }: Awaited<ReturnType<typeof readSheet>>, t: TFunction): { questions: ParsedQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  for (const { line, cells } of rows) {
    const [text = "", rawType = "", subject = "", ...rest] = cells;
    const optionCells = rest.slice(0, 6);
    const answer = rest[6] ?? "";
    const explanation = rest[7] ?? "";
    const type = parseType(rawType);
    if (text.length < 3) {
      errors.push(t("{line}-qator: savol matni kiritilmagan", { line }));
      continue;
    }
    if (!type) {
      errors.push(t(`{line}-qator: turi noto'g'ri ("bitta", "ko'p" yoki "to'g'ri/noto'g'ri" yozing)`, { line }));
      continue;
    }
    let options: { text: string; isCorrect: boolean }[];
    if (type === "TRUE_FALSE") {
      const a = norm(answer);
      const truth = a === "togri" || a === "ha" || a === "true" || a === "a";
      const falsy = a === "notogri" || a === "yoq" || a === "false" || a === "b";
      if (!truth && !falsy) {
        errors.push(t(`{line}-qator: to'g'ri javob ustuniga "To'g'ri" yoki "Noto'g'ri" yozing`, { line }));
        continue;
      }
      options = [
        { text: "To'g'ri", isCorrect: truth },
        { text: "Noto'g'ri", isCorrect: !truth },
      ];
    } else {
      const filled = optionCells.map((t, i) => ({ letter: LETTERS[i]!, text: t })).filter((o) => o.text);
      const correct = new Set(answer.toUpperCase().split(/[\s,;]+/).filter(Boolean));
      if (filled.length < 2) {
        errors.push(t("{line}-qator: kamida 2 ta variant (A, B ...) kerak", { line }));
        continue;
      }
      const bad = [...correct].filter((c) => !filled.some((o) => o.letter === c));
      if (correct.size === 0 || bad.length) {
        errors.push(t(`{line}-qator: to'g'ri javob harfi(lari) noto'g'ri: "{answer}"`, { line, answer }));
        continue;
      }
      if (type === "SINGLE" && correct.size > 1) {
        errors.push(t("{line}-qator: bitta javobli savolda faqat bitta to'g'ri javob bo'ladi", { line }));
        continue;
      }
      options = filled.map((o) => ({ text: o.text.slice(0, 1000), isCorrect: correct.has(o.letter) }));
    }
    questions.push({ text: text.slice(0, 4000), type, subject: subject.slice(0, 80) || null, explanation: explanation.slice(0, 2000) || null, options });
  }
  return { questions, errors };
}

export async function saveQuestions(data: ParsedQuestion[], testId?: string) {
  await prisma.$transaction(
    async (tx) => {
      let pos = 0;
      if (testId) {
        const max = await tx.testQuestion.aggregate({ where: { testId }, _max: { position: true } });
        pos = (max._max.position ?? -1) + 1;
      }
      for (const q of data) {
        const created = await tx.question.create({
          data: {
            text: q.text,
            type: q.type,
            subject: q.subject,
            explanation: q.explanation,
            options: { create: q.options.map((o, i) => ({ ...o, position: i })) },
          },
          select: { id: true },
        });
        if (testId) await tx.testQuestion.create({ data: { testId, questionId: created.id, position: pos++ } });
      }
    },
    { timeout: 60_000 },
  );
}
