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

const normTF = (s: string) => s.toLowerCase().replace(/[ʻʼ'`’‘\s]/g, "");

type Draft = { line: number; text: string[]; options: { letter: string; text: string; marked: boolean }[]; answer: string | null; explanation: string | null; subject: string | null };

export function parseQuestionText(raw: string): { questions: ParsedQuestion[]; errors: string[] } {
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
  const errors: string[] = [];
  drafts.forEach((d, idx) => {
    const n = idx + 1;
    const label = `${n}-savol ("${d.text[0]!.slice(0, 40)}")`;
    if (d.options.length < 2) {
      errors.push(`${label}: kamida 2 ta variant (A), B) ...) kerak`);
      return;
    }
    if (d.options.length > 6) {
      errors.push(`${label}: ko'pi bilan 6 ta variant bo'lishi mumkin`);
      return;
    }
    let correct: Set<string>;
    if (d.answer) {
      correct = new Set(d.answer.toUpperCase().split(/[\s,;]+/).filter(Boolean));
      const bad = [...correct].filter((c) => !d.options.some((o) => o.letter === c));
      if (bad.length) {
        errors.push(`${label}: "Javob" qatoridagi harf variantlarda yo'q: ${bad.join(", ")}`);
        return;
      }
    } else {
      correct = new Set(d.options.filter((o) => o.marked).map((o) => o.letter));
    }
    if (correct.size === 0) {
      errors.push(`${label}: to'g'ri javob belgilanmagan (variant oldiga * qo'ying yoki "Javob: B" yozing)`);
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
  if (drafts.length === 0) errors.push("Faylda savol topilmadi. Har bir savol raqam bilan boshlanishi kerak: \"1. Savol matni\"");
  return { questions, errors };
}
