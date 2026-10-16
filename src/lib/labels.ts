import type { StudyForm } from "@prisma/client";

export const STUDY_FORMS: { value: StudyForm; label: string }[] = [
  { value: "KUNDUZGI", label: "Kunduzgi" },
  { value: "SIRTQI", label: "Sirtqi" },
  { value: "KECHKI", label: "Kechki" },
  { value: "MASOFAVIY", label: "Masofaviy" },
];

export function studyFormLabel(v: StudyForm | null | undefined) {
  return STUDY_FORMS.find((f) => f.value === v)?.label ?? "—";
}

/** "kunduzgi", "Sirtqi", "KECHKI" kabi matnni ta'lim shakliga aylantiradi. */
export function parseStudyForm(raw: string): StudyForm | null | undefined {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  return STUDY_FORMS.find((f) => f.label.toLowerCase() === t || f.value.toLowerCase() === t)?.value;
}

export function isStudyForm(v: string): v is StudyForm {
  return STUDY_FORMS.some((f) => f.value === v);
}

export const ROLE_LABEL = { ADMIN: "Administrator", MANAGER: "Menejer", STUDENT: "Talaba" } as const;
