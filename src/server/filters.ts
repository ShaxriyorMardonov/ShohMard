import "server-only";
import type { Prisma, StudyForm } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isStudyForm } from "@/lib/labels";

export type OrgFilters = { form?: string; university?: string; faculty?: string; group?: string };

/** Universitet → fakultet → guruh tanlovlari (tanlanganiga qarab toraytiriladi). */
export async function orgOptions(scope: string | null, f: OrgFilters) {
  const uni = scope ?? f.university ?? undefined;
  const [universities, faculties, groups] = await Promise.all([
    scope ? Promise.resolve([]) : prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.faculty.findMany({
      where: uni ? { universityId: uni } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true, university: { select: { shortName: true } } },
    }),
    prisma.group.findMany({
      where: { ...(uni ? { universityId: uni } : {}), ...(f.faculty ? { facultyId: f.faculty } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, university: { select: { shortName: true } } },
    }),
  ]);
  const suffix = (s: string) => (uni ? "" : ` (${s})`);
  return {
    universities: universities.map((u) => ({ value: u.id, label: u.name })),
    faculties: faculties.map((x) => ({ value: x.id, label: x.name + suffix(x.university.shortName) })),
    groups: groups.map((x) => ({ value: x.id, label: x.name + suffix(x.university.shortName) })),
  };
}

/** Talaba (User) uchun universitet/fakultet/guruh/ta'lim shakli sharti. */
export function studentOrgWhere(scope: string | null, f: OrgFilters): Prisma.UserWhereInput {
  const uni = scope ?? f.university;
  return {
    ...(uni ? { universityId: uni } : {}),
    ...(f.faculty ? { facultyId: f.faculty } : {}),
    ...(f.group ? { groupId: f.group } : {}),
    ...(f.form && isStudyForm(f.form) ? { studyForm: f.form as StudyForm } : {}),
  };
}
