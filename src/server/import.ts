import "server-only";
import ExcelJS from "exceljs";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import type { QuestionType, StudyForm } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { parseQuestionText, type ParsedQuestion } from "@/lib/question-text-parser";
import { parseStudyForm } from "@/lib/labels";
import { loginField, passwordSchema } from "@/lib/validation";
import { resolveFacultyGroup } from "@/server/org";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type ImportResult = {
  ok: boolean;
  created?: number;
  skipped?: number;
  message?: string;
  errors?: string[];
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
  const { rows } = await readSheet(file);
  if (rows.length > 500) return { ok: false, message: "Bir martada ko'pi bilan 500 ta universitet" };
  const errors: string[] = [];
  const data: { name: string; shortName: string; city: string | null }[] = [];
  const seen = new Set<string>();
  for (const { line, cells } of rows) {
    const [name = "", shortName = "", city = ""] = cells;
    if (name.length < 3) errors.push(`${line}-qator: universitet nomi kamida 3 belgi bo'lsin`);
    else if (!shortName) errors.push(`${line}-qator: qisqa nomi kiritilmagan`);
    else if (name.length > 160 || shortName.length > 20) errors.push(`${line}-qator: nom juda uzun`);
    else if (seen.has(norm(name))) errors.push(`${line}-qator: "${name}" faylda takrorlangan`);
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
// Ustunlar: F.I.Sh. | Login | Parol | Universitet | Fakultet | Guruh | Ta'lim shakli
// Ustunlar sarlavha bo'yicha topiladi; sarlavha tanilmasa, shu tartibda deb olinadi.
const STUDENT_COLS: { key: string; match: (h: string) => boolean }[] = [
  { key: "fullName", match: (h) => h.includes("f.i") || h.includes("fio") || h.includes("ism") },
  { key: "login", match: (h) => h.startsWith("login") },
  { key: "password", match: (h) => h.startsWith("parol") || h.startsWith("password") },
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
  const recognized = Object.keys(map).length >= 3;
  if (!recognized) STUDENT_COLS.forEach((c, i) => (map[c.key] = i));
  // Eski namuna: F.I.Sh. | Login | Parol | Universitet | Guruh
  if (recognized && !("faculty" in map) && !("group" in map) && header.length >= 5) map.group = 4;
  return map;
}

export async function importStudents(file: File, scope: string | null = null): Promise<ImportResult> {
  const { header, rows } = await readSheet(file);
  if (rows.length > 300) return { ok: false, message: "Bir martada ko'pi bilan 300 ta talaba yuklash mumkin" };
  const col = columnMap(header);
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
  type Row = { fullName: string; login: string; password: string; universityId: string; faculty: string; group: string; studyForm: StudyForm | null };
  const data: Row[] = [];
  const logins = new Set<string>();
  for (const { line, cells } of rows) {
    const fullName = get(cells, "fullName");
    const uni = get(cells, "university");
    const lg = loginField.safeParse(get(cells, "login"));
    const password = get(cells, "password");
    const pw = passwordSchema.safeParse(password);
    const universityId = scope ?? uniBy.get(norm(uni));
    const studyForm = parseStudyForm(get(cells, "studyForm"));
    if (fullName.length < 3) errors.push(`${line}-qator: F.I.Sh. kiritilmagan`);
    else if (!lg.success) errors.push(`${line}-qator: login — ${lg.error.issues[0]?.message}`);
    else if (!pw.success) errors.push(`${line}-qator: parol — ${pw.error.issues[0]?.message}`);
    else if (!universityId) errors.push(`${line}-qator: "${uni}" universiteti topilmadi`);
    else if (studyForm === undefined) errors.push(`${line}-qator: ta'lim shakli Kunduzgi, Sirtqi, Kechki yoki Masofaviy bo'lishi kerak`);
    else if (logins.has(lg.data)) errors.push(`${line}-qator: "${lg.data}" logini faylda takrorlangan`);
    else {
      logins.add(lg.data);
      data.push({
        fullName: fullName.slice(0, 120),
        login: lg.data,
        password,
        universityId,
        faculty: get(cells, "faculty").slice(0, 120),
        group: get(cells, "group").slice(0, 40),
        studyForm,
      });
    }
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 50) };
  const taken = await prisma.user.findMany({ where: { login: { in: data.map((d) => d.login) } }, select: { login: true } });
  if (taken.length) {
    return { ok: false, errors: taken.slice(0, 50).map((t) => `"${t.login}" logini allaqachon band`) };
  }
  const orgCache = new Map<string, { facultyId: string | null; groupId: string | null }>();
  const prepared = [];
  for (const d of data) {
    const key = `${d.universityId}|${norm(d.faculty)}|${norm(d.group)}`;
    let org = orgCache.get(key);
    if (!org) {
      org = await resolveFacultyGroup(d.universityId, d.faculty, d.group);
      orgCache.set(key, org);
    }
    prepared.push({
      fullName: d.fullName,
      login: d.login,
      universityId: d.universityId,
      ...org,
      studyForm: d.studyForm,
      role: "STUDENT" as const,
      passwordHash: await hashPassword(d.password),
    });
  }
  await prisma.user.createMany({ data: prepared });
  return { ok: true, created: prepared.length };
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

export async function importQuestions(file: File, testId?: string): Promise<ImportResult> {
  if (testId) {
    const test = await prisma.test.findUnique({ where: { id: testId }, select: { _count: { select: { attempts: true } } } });
    if (!test) return { ok: false, message: "Test topilmadi" };
    if (test._count.attempts > 0) return { ok: false, message: "Test boshlangan, savollar qo'shib bo'lmaydi" };
  }
  let parsed: { questions: ParsedQuestion[]; errors: string[] };
  if (/\.docx$/i.test(file.name)) {
    checkSize(file);
    let text: string;
    try {
      text = (await mammoth.extractRawText({ buffer: Buffer.from(await file.arrayBuffer()) })).value;
    } catch {
      return { ok: false, message: "Word faylni o'qib bo'lmadi. U .docx formatida ekanini tekshiring" };
    }
    parsed = parseQuestionText(text);
  } else if (/\.doc$/i.test(file.name)) {
    checkSize(file);
    let text: string;
    try {
      text = (await new WordExtractor().extract(Buffer.from(await file.arrayBuffer()))).getBody();
    } catch {
      return { ok: false, message: "Word (.doc) faylni o'qib bo'lmadi" };
    }
    parsed = parseQuestionText(text);
  } else if (/\.xlsx$/i.test(file.name)) {
    parsed = parseQuestionSheet(await readSheet(file));
  } else {
    return { ok: false, message: "Savollar uchun Word (.doc, .docx) yoki Excel (.xlsx) fayl yuklang" };
  }
  if (parsed.errors.length) return { ok: false, errors: parsed.errors.slice(0, 50) };
  if (parsed.questions.length > 1000) return { ok: false, message: "Bir martada ko'pi bilan 1000 ta savol" };
  await saveQuestions(parsed.questions, testId);
  return { ok: true, created: parsed.questions.length };
}

function parseQuestionSheet({ rows }: Awaited<ReturnType<typeof readSheet>>): { questions: ParsedQuestion[]; errors: string[] } {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];
  for (const { line, cells } of rows) {
    const [text = "", rawType = "", subject = "", ...rest] = cells;
    const optionCells = rest.slice(0, 6);
    const answer = rest[6] ?? "";
    const explanation = rest[7] ?? "";
    const type = parseType(rawType);
    if (text.length < 3) {
      errors.push(`${line}-qator: savol matni kiritilmagan`);
      continue;
    }
    if (!type) {
      errors.push(`${line}-qator: turi noto'g'ri ("bitta", "ko'p" yoki "to'g'ri/noto'g'ri" yozing)`);
      continue;
    }
    let options: { text: string; isCorrect: boolean }[];
    if (type === "TRUE_FALSE") {
      const a = norm(answer);
      const truth = a === "togri" || a === "ha" || a === "true" || a === "a";
      const falsy = a === "notogri" || a === "yoq" || a === "false" || a === "b";
      if (!truth && !falsy) {
        errors.push(`${line}-qator: to'g'ri javob ustuniga "To'g'ri" yoki "Noto'g'ri" yozing`);
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
        errors.push(`${line}-qator: kamida 2 ta variant (A, B ...) kerak`);
        continue;
      }
      const bad = [...correct].filter((c) => !filled.some((o) => o.letter === c));
      if (correct.size === 0 || bad.length) {
        errors.push(`${line}-qator: to'g'ri javob harfi(lari) noto'g'ri: "${answer}"`);
        continue;
      }
      if (type === "SINGLE" && correct.size > 1) {
        errors.push(`${line}-qator: bitta javobli savolda faqat bitta to'g'ri javob bo'ladi`);
        continue;
      }
      options = filled.map((o) => ({ text: o.text.slice(0, 1000), isCorrect: correct.has(o.letter) }));
    }
    questions.push({ text: text.slice(0, 4000), type, subject: subject.slice(0, 80) || null, explanation: explanation.slice(0, 2000) || null, options });
  }
  return { questions, errors };
}

async function saveQuestions(data: ParsedQuestion[], testId?: string) {
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
