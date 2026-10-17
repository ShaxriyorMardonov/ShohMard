import type { TestKind } from "@prisma/client";

/**
 * Foiz bo'yicha baho: 0–59 qoniqarsiz, 60–69 qoniqarli, 70–89 yaxshi, 90–100 a'lo.
 * Mahalliy olimpiadada 100% — "Super", xalqaro olimpiadada 100% — g'olib.
 */
export type GradeKey = "fail" | "satisfactory" | "good" | "excellent" | "super" | "winner";

export const GRADE: Record<GradeKey, { label: string; variant: "error" | "warning" | "default" | "success" }> = {
  fail: { label: "Qoniqarsiz", variant: "error" },
  satisfactory: { label: "Qoniqarli", variant: "warning" },
  good: { label: "Yaxshi", variant: "default" },
  excellent: { label: "A'lo", variant: "success" },
  super: { label: "Super", variant: "success" },
  winner: { label: "G'olib", variant: "success" },
};

export function gradeKey(percent: number | null | undefined, kind: TestKind = "REGULAR"): GradeKey {
  const p = percent ?? 0;
  if (p >= 100 && kind === "OLYMPIAD_INTL") return "winner";
  if (p >= 100 && kind === "OLYMPIAD_LOCAL") return "super";
  if (p < 60) return "fail";
  if (p < 70) return "satisfactory";
  if (p < 90) return "good";
  return "excellent";
}

export function gradeLabel(percent: number | null | undefined, kind: TestKind = "REGULAR") {
  return GRADE[gradeKey(percent, kind)].label;
}

/**
 * Sertifikat qoniqarli, yaxshi va a'lo natijalar uchun beriladi.
 * Olimpiadalarda har bir ishtirokchiga beriladi (60% dan past — "ishtirokingiz uchun").
 */
export function hasCertificate(percent: number | null | undefined, kind: TestKind = "REGULAR") {
  if (kind !== "REGULAR") return percent !== null && percent !== undefined;
  return gradeKey(percent, kind) !== "fail";
}

/**
 * Xalqaro olimpiadada o'rin: barcha savollarga to'g'ri javob — 1-o'rin,
 * bitta xato — 2-o'rin, ikkita xato — 3-o'rin (masalan, 25 savoldan 25, 24, 23).
 */
export function olympiadPlace(kind: TestKind, correct: number | null | undefined, total: number | null | undefined): 1 | 2 | 3 | null {
  if (kind !== "OLYMPIAD_INTL" || !total || correct === null || correct === undefined) return null;
  const wrong = total - correct;
  return wrong === 0 ? 1 : wrong === 1 ? 2 : wrong === 2 ? 3 : null;
}
