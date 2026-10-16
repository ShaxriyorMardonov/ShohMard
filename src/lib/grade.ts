/** Foiz bo'yicha baho: 0–59 qoniqarsiz, 60–69 qoniqarli, 70–89 yaxshi, 90–100 a'lo. */
export type GradeKey = "fail" | "satisfactory" | "good" | "excellent";

export const GRADE: Record<GradeKey, { label: string; variant: "error" | "warning" | "default" | "success" }> = {
  fail: { label: "Qoniqarsiz", variant: "error" },
  satisfactory: { label: "Qoniqarli", variant: "warning" },
  good: { label: "Yaxshi", variant: "default" },
  excellent: { label: "A'lo", variant: "success" },
};

export function gradeKey(percent: number | null | undefined): GradeKey {
  const p = percent ?? 0;
  if (p < 60) return "fail";
  if (p < 70) return "satisfactory";
  if (p < 90) return "good";
  return "excellent";
}

export function gradeLabel(percent: number | null | undefined) {
  return GRADE[gradeKey(percent)].label;
}

/** Sertifikat faqat qoniqarli, yaxshi va a'lo natijalar uchun beriladi. */
export function hasCertificate(percent: number | null | undefined) {
  return gradeKey(percent) !== "fail";
}
