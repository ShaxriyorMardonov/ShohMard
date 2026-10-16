import type { QuestionType } from "@prisma/client";

export type ParsedQuestion = {
  text: string;
  type: QuestionType;
  subject: string | null;
  explanation: string | null;
  options: { text: string; isCorrect: boolean }[];
};

/**
 * Word'dagi oddiy test formatini o'qiydi:
 *
 *   Fan: Matematika            (ixtiyoriy, keyingi savollarga qo'llanadi)
 *   1. Savol matni?
 *   A) variant
 *   *B) to'g'ri variant        (to'g'ri javob oldiga * yoki + qo'yiladi)
 *   C) variant
 *   Javob: B                   (ixtiyoriy, * o'rniga)
 *   Izoh: ...                  (ixtiyoriy)
 *
 * Bir nechta to'g'ri javob bo'lsa — ko'p javobli savol.
 * Variantlar faqat "To'g'ri" va "Noto'g'ri" bo'lsa — to'g'ri/noto'g'ri savol.
 */
const Q_START = /^\s*(\d{1,4})\s*[.)]\s*(.+)$/;
const OPT = /^\s*([*+]?)\s*([A-Fa-f])\s*[).]\s*(.*?)\s*([*+]?)\s*$/;
const ANSWER = /^\s*(javob|to['ʻʼ’`]?g['ʻʼ’`]?ri javob|answer)\s*[:\-–]\s*(.+)$/i;
const SUBJECT = /^\s*fan\s*[:\-–]\s*(.+)$/i;
const NOTE = /^\s*izoh\s*[:\-–]\s*(.+)$/i;

/** Xato matnlarini tarjima qilish uchun (sof funksiya; standart holatda o'zbekcha qoladi). */
/** Xato va u tegishli qator (1 dan; matn muharririda shu qatorga o'tish uchun). */
export type ParseIssue = { line: number; message: string };
export type ParseResult = { questions: ParsedQuestion[]; errors: string[]; issues: ParseIssue[] };

export type ParserT = (key: string, vars?: Record<string, string | number>) => string;
const uzT: ParserT = (key, vars) => (vars ? key.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : key);

const normTF = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘\s]/g, "");

type Draft = { line: number; text: string[]; options: { letter: string; text: string; marked: boolean }[]; answer: string | null; explanation: string | null; subject: string | null };

const SEP_OPT = /^\s*={4,}\s*$/m;

/**
 * HEMIS/Moodle formatini o'qiydi:
 *
 *   Savol matni?
 *   ====
 *   #to'g'ri variant           (to'g'ri javob oldiga # qo'yiladi)
 *   ====
 *   variant
 *   ++++                       (keyingi savol)
 */
function splitBlocks(raw: string): { start: number; text: string }[] {
  const blocks: { start: number; text: string }[] = [];
  let cur: string[] = [];
  let start = 1;
  raw.split("\n").forEach((l, i) => {
    if (/^\s*\+{4,}\s*$/.test(l)) {
      if (cur.join("").trim()) blocks.push({ start, text: cur.join("\n") });
      cur = [];
      start = i + 2;
      return;
    }
    if (!cur.length && !l.trim()) {
      start = i + 2;
      return;
    }
    cur.push(l);
  });
  if (cur.join("").trim()) blocks.push({ start, text: cur.join("\n") });
  return blocks;
}

function parseSeparatedText(raw: string, tr: ParserT): ParseResult {
  const questions: ParsedQuestion[] = [];
  const issues: ParseIssue[] = [];
  let subject: string | null = null;
  const blocks = splitBlocks(raw);
  blocks.forEach(({ start, text: block }, idx) => {
    const errors = { push: (message: string) => issues.push({ line: start, message }) };
    const parts = block.split(SEP_OPT).map((p) => p.trim());
    const qLines = parts[0]!.split("\n").map((l) => l.trim()).filter(Boolean);
    let m: RegExpMatchArray | null;
    while (qLines.length && (m = qLines[0]!.match(SUBJECT))) {
      subject = m[1]!.trim().slice(0, 80);
      qLines.shift();
    }
    const text = qLines.join("\n");
    const label = tr('{n}-savol ("{preview}")', { n: idx + 1, preview: (text || "?").slice(0, 40) });
    if (!text) {
      errors.push(tr("{label}: savol matni bo'sh", { label }));
      return;
    }
    const opts = parts
      .slice(1)
      .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean)
      .map((p) => ({ marked: p.startsWith("#"), text: p.replace(/^#\s*/, "").trim() }))
      .filter((o) => o.text);
    if (opts.length < 2) {
      errors.push(tr("{label}: kamida 2 ta variant kerak (variantlar ==== bilan ajratiladi)", { label }));
      return;
    }
    if (opts.length > 6) {
      errors.push(tr("{label}: ko'pi bilan 6 ta variant bo'lishi mumkin", { label }));
      return;
    }
    const nCorrect = opts.filter((o) => o.marked).length;
    if (nCorrect === 0) {
      errors.push(tr("{label}: to'g'ri javob belgilanmagan (to'g'ri variant oldiga # qo'ying)", { label }));
      return;
    }
    const options = opts.map((o) => ({ text: o.text.slice(0, 1000), isCorrect: o.marked }));
    const isTF =
      options.length === 2 &&
      options.some((o) => normTF(o.text) === "togri") &&
      options.some((o) => normTF(o.text) === "notogri");
    questions.push({
      text: text.slice(0, 4000),
      type: isTF ? "TRUE_FALSE" : nCorrect > 1 ? "MULTIPLE" : "SINGLE",
      subject,
      explanation: null,
      options,
    });
  });
  if (blocks.length === 0) issues.push({ line: 1, message: tr("Faylda savol topilmadi") });
  return { questions, errors: issues.map((i) => i.message), issues };
}

export function parseQuestionText(raw: string, tr: ParserT = uzT): ParseResult {
  raw = raw.replace(/\r\n?/g, "\n");
  if (SEP_OPT.test(raw)) return parseSeparatedText(raw, tr);
  const lines = raw.replace(/\r/g, "").split("\n");
  const drafts: Draft[] = [];
  let subject: string | null = null;
  let cur: Draft | null = null;

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    let m: RegExpMatchArray | null;
    if ((m = t.match(SUBJECT))) {
      subject = m[1]!.trim().slice(0, 80);
      return;
    }
    if ((m = t.match(Q_START)) && !(cur && cur.options.length === 0 && /^[A-Fa-f]$/.test(m[1]!))) {
      cur = { line: i + 1, text: [m[2]!.trim()], options: [], answer: null, explanation: null, subject };
      drafts.push(cur);
      return;
    }
    if (!cur) return; // savoldan oldingi sarlavha matnlari e'tiborsiz qoldiriladi
    if ((m = t.match(ANSWER))) {
      cur.answer = m[2]!.trim();
      return;
    }
    if ((m = t.match(NOTE))) {
      cur.explanation = m[1]!.trim();
      return;
    }
    if ((m = t.match(OPT)) && m[3]) {
      cur.options.push({ letter: m[2]!.toUpperCase(), text: m[3]!, marked: !!(m[1] || m[4]) });
      return;
    }
    if (cur.options.length === 0) cur.text.push(t);
    else cur.options[cur.options.length - 1]!.text += " " + t;
  });

  const questions: ParsedQuestion[] = [];
  const issues: ParseIssue[] = [];
  drafts.forEach((d, idx) => {
    const errors = { push: (message: string) => issues.push({ line: d.line, message }) };
    const n = idx + 1;
    const label = tr('{n}-savol ("{preview}")', { n, preview: d.text[0]!.slice(0, 40) });
    if (d.options.length < 2) {
      errors.push(tr("{label}: kamida 2 ta variant (A), B) ...) kerak", { label }));
      return;
    }
    if (d.options.length > 6) {
      errors.push(tr("{label}: ko'pi bilan 6 ta variant bo'lishi mumkin", { label }));
      return;
    }
    let correct: Set<string>;
    if (d.answer) {
      correct = new Set(d.answer.toUpperCase().split(/[\s,;]+/).filter(Boolean));
      const bad = [...correct].filter((c) => !d.options.some((o) => o.letter === c));
      if (bad.length) {
        errors.push(tr('{label}: "Javob" qatoridagi harf variantlarda yo\'q: {letters}', { label, letters: bad.join(", ") }));
        return;
      }
    } else {
      correct = new Set(d.options.filter((o) => o.marked).map((o) => o.letter));
    }
    if (correct.size === 0) {
      errors.push(tr("{label}: to'g'ri javob belgilanmagan (variant oldiga * qo'ying yoki \"Javob: B\" yozing)", { label }));
      return;
    }
    const options = d.options.map((o) => ({ text: o.text.replace(/\s*[*+]\s*$/, "").trim().slice(0, 1000), isCorrect: correct.has(o.letter) }));
    const isTF =
      options.length === 2 &&
      options.some((o) => normTF(o.text) === "togri") &&
      options.some((o) => normTF(o.text) === "notogri");
    const type: QuestionType = isTF ? "TRUE_FALSE" : correct.size > 1 ? "MULTIPLE" : "SINGLE";
    questions.push({
      text: d.text.join("\n").slice(0, 4000),
      type,
      subject: d.subject,
      explanation: d.explanation?.slice(0, 2000) ?? null,
      options,
    });
  });
  if (drafts.length === 0) issues.push({ line: 1, message: tr("Faylda savol topilmadi. Har bir savol raqam bilan boshlanishi kerak: \"1. Savol matni\"") });
  return { questions, errors: issues.map((i) => i.message), issues };
}
