import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/admin/filter-bar";
import { TestsTable, type TestListRow } from "@/components/admin/tests-table";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { testState } from "@/lib/exam-rules";
import { formatDateTime, formatDuration } from "@/lib/time";
import { testScopeWhere } from "@/server/org";

export const metadata: Metadata = { title: "Testlar" };

type SP = { q?: string; subject?: string; university?: string; state?: string };
const NO_SUBJECT = "Fan ko'rsatilmagan";

function stateWhere(state: string | undefined, now: Date): Prisma.TestWhereInput {
  switch (state) {
    case "active":
      return { isPublished: true };
    case "inactive":
      return { isPublished: false };
    case "upcoming":
      return { isPublished: true, startsAt: { gt: now } };
    case "open":
      return { isPublished: true, startsAt: { lte: now }, endsAt: { gt: now } };
    case "closed":
      return { isPublished: true, endsAt: { lte: now } };
    default:
      return {};
  }
}

export default async function TestsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireStaff();
  const sp = await searchParams;
  const now = new Date();
  const q = (sp.q ?? "").trim().slice(0, 100);
  const scope = testScopeWhere(staff.scope);
  const where: Prisma.TestWhereInput = {
    AND: [
      scope,
      stateWhere(sp.state, now),
      sp.subject ? (sp.subject === "__none" ? { subject: null } : { subject: sp.subject }) : {},
      sp.university && !staff.scope ? { universities: { some: { id: sp.university } } } : {},
      q ? { title: { contains: q, mode: "insensitive" } } : {},
    ],
  };
  const [tests, subjects, universities] = await Promise.all([
    prisma.test.findMany({
      where,
      orderBy: { startsAt: "desc" },
      include: {
        universities: { select: { shortName: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    }),
    prisma.test.findMany({ where: scope, distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
    staff.scope ? Promise.resolve([]) : prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const bySubject = new Map<string, TestListRow[]>();
  for (const t of tests) {
    const key = t.subject ?? NO_SUBJECT;
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push({
      id: t.id,
      title: t.title,
      subject: t.subject,
      state: testState(t, now),
      isPublished: t.isPublished,
      startsAt: formatDateTime(t.startsAt),
      endsAt: formatDateTime(t.endsAt),
      duration: formatDuration(t.durationMinutes),
      questions: t._count.questions,
      attempts: t._count.attempts,
      universities: t.universities.map((u) => u.shortName).join(", "),
    });
  }
  const groups = [...bySubject.entries()]
    .sort(([a], [b]) => (a === NO_SUBJECT ? 1 : b === NO_SUBJECT ? -1 : a.localeCompare(b)))
    .map(([subject, rows]) => ({ subject, rows }));

  return (
    <>
      <PageHeader
        title="Testlar"
        description={`Fanlar kesimida · jami ${tests.length} ta test`}
        actions={<Button asChild><Link href="/admin/tests/new"><Plus /> Yangi test</Link></Button>}
      />
      <FilterBar
        search={{ placeholder: "Test nomi bo'yicha qidirish" }}
        values={sp}
        fields={[
          {
            name: "subject",
            label: "Fan",
            all: "Barcha fanlar",
            options: subjects.map((s) => (s.subject ? { value: s.subject, label: s.subject } : { value: "__none", label: NO_SUBJECT })),
          },
          {
            name: "state",
            label: "Holat",
            all: "Barcha holatlar",
            options: [
              { value: "active", label: "Faol" },
              { value: "inactive", label: "Nofaol" },
              { value: "upcoming", label: "Rejalashtirilgan" },
              { value: "open", label: "Hozir ochiq" },
              { value: "closed", label: "Yakunlangan" },
            ],
          },
          ...(staff.scope ? [] : [{ name: "university", label: "Universitet", all: "Barcha universitetlar", options: universities.map((u) => ({ value: u.id, label: u.name })) }]),
        ]}
      />
      {tests.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="Testlar topilmadi" description="Filtrni o'zgartiring yoki yangi test yarating." />
      ) : (
        <TestsTable groups={groups} canDelete={!staff.scope} />
      )}
    </>
  );
}
