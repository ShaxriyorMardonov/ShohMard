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
 * Xalqaro olimpiadada har bir ishtirokchiga beriladi (100% — g'olib sertifikati).
 */
export function hasCertificate(percent: number | null | undefined, kind: TestKind = "REGULAR") {
  if (kind === "OLYMPIAD_INTL") return percent !== null && percent !== undefined;
  return gradeKey(percent, kind) !== "fail";
}
