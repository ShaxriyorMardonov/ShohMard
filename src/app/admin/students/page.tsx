import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/admin/filter-bar";
import { ImportDialog } from "@/components/admin/import-dialog";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { StudentDialog, type OrgNames } from "@/components/admin/student-dialog";
import { StudentsTable } from "@/components/admin/students-table";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STUDY_FORMS } from "@/lib/labels";
import { orgOptions, studentOrgWhere } from "@/server/filters";

export const metadata: Metadata = { title: "Talabalar" };
export const maxDuration = 60;
const PER_PAGE = 30;

type SP = { q?: string; form?: string; university?: string; faculty?: string; group?: string; page?: string };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = parsePage(sp.page);
  const where: Prisma.UserWhereInput = {
    roles: { has: "STUDENT" },
    ...studentOrgWhere(staff.scope, sp),
    ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { login: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const uniFilter = staff.scope ? { id: staff.scope } : {};
  const [universities, options, total, students, faculties, groups] = await Promise.all([
    prisma.university.findMany({ where: uniFilter, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    orgOptions(staff.scope, sp),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        fullName: true,
        login: true,
        isActive: true,
        universityId: true,
        studyForm: true,
        lastLoginAt: true,
        university: { select: { shortName: true } },
        faculty: { select: { name: true } },
        group: { select: { name: true } },
        _count: { select: { attempts: true } },
      },
    }),
    prisma.faculty.findMany({ where: staff.scope ? { universityId: staff.scope } : {}, select: { name: true, universityId: true }, orderBy: { name: "asc" } }),
    prisma.group.findMany({ where: staff.scope ? { universityId: staff.scope } : {}, select: { name: true, universityId: true }, orderBy: { name: "asc" } }),
  ]);
  const orgNames: OrgNames = {};
  for (const u of universities) orgNames[u.id] = { faculties: [], groups: [] };
  for (const f of faculties) orgNames[f.universityId]?.faculties.push(f.name);
  for (const g of groups) orgNames[g.universityId]?.groups.push(g.name);
  const fixedUniversity = staff.scope ?? undefined;

  return (
    <>
      <PageHeader
        title="Talabalar"
        description={staff.scope ? `${staff.university?.name} talabalari` : "Talaba hisoblari administrator yoki universitet menejeri tomonidan yaratiladi"}
        actions={
          <>
            <ImportDialog kind="students" />
            <StudentDialog
              universities={universities}
              orgNames={orgNames}
              fixedUniversity={fixedUniversity}
              trigger={<Button disabled={!universities.length}><Plus /> Talaba qo&apos;shish</Button>}
            />
          </>
        }
      />
      <FilterBar
        search={{ placeholder: "Ism yoki login bo'yicha qidirish" }}
        values={sp}
        fields={[
          { name: "form", label: "Ta'lim shakli", all: "Barcha ta'lim shakllari", options: STUDY_FORMS },
          ...(staff.scope ? [] : [{ name: "university", label: "Universitet", all: "Barcha universitetlar", options: options.universities, resets: ["faculty", "group"] }]),
          { name: "faculty", label: "Fakultet", all: "Barcha fakultetlar", options: options.faculties, resets: ["group"] },
          { name: "group", label: "Guruh", all: "Barcha guruhlar", options: options.groups },
        ]}
      />
      {students.length === 0 ? (
        <EmptyState icon={<Users />} title="Talabalar topilmadi" description={universities.length ? "Filtrni o'zgartiring yoki yangi talaba qo'shing." : "Avval universitet qo'shing."} />
      ) : (
        <Card className="overflow-hidden">
          <StudentsTable
            rows={students.map(({ _count, lastLoginAt, ...s }) => ({ ...s, lastLoginAt: lastLoginAt?.toISOString() ?? null, attempts: _count.attempts }))}
            universities={universities}
            orgNames={orgNames}
            fixedUniversity={fixedUniversity}
            canDelete={!staff.scope}
          />
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={{ q, form: sp.form, university: sp.university, faculty: sp.faculty, group: sp.group }} />
        </Card>
      )}
    </>
  );
}
