import Link from "next/link";
import { TestsTabs } from "@/components/admin/tests-tabs";
import { ClipboardList, Plus } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/admin/filter-bar";
import { TestsTable, type TestListRow } from "@/components/admin/tests-table";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { testState } from "@/lib/exam-rules";
import { formatDateTime, formatDuration } from "@/lib/time";
import { testScopeWhere } from "@/server/org";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Testlar") };
}

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
  const { t, lang } = await getT();
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
  for (const x of tests) {
    const key = x.subject ?? NO_SUBJECT;
    if (!bySubject.has(key)) bySubject.set(key, []);
    bySubject.get(key)!.push({
      id: x.id,
      title: x.title,
      subject: x.subject,
      state: testState(x, now),
      isPublished: x.isPublished,
      startsAt: formatDateTime(x.startsAt, lang),
      endsAt: formatDateTime(x.endsAt, lang),
      duration: formatDuration(x.durationMinutes, lang),
      questions: x._count.questions,
      attempts: x._count.attempts,
      universities: x.universities.map((u) => u.shortName).join(", "),
    });
  }
  const groups = [...bySubject.entries()]
    .sort(([a], [b]) => (a === NO_SUBJECT ? 1 : b === NO_SUBJECT ? -1 : a.localeCompare(b)))
    .map(([subject, rows]) => ({ subject: subject === NO_SUBJECT ? t(NO_SUBJECT) : subject, rows }));

  return (
    <>
      <TestsTabs active="tests" showBank={!staff.scope} />
      <PageHeader
        title={t("Testlar")}
        description={t("Fanlar kesimida · jami {n} ta test", { n: tests.length })}
        actions={<Button asChild><Link href="/admin/tests/new"><Plus /> {t("Yangi test")}</Link></Button>}
      />
      <FilterBar
        search={{ placeholder: t("Test nomi bo'yicha qidirish") }}
        values={sp}
        fields={[
          {
            name: "subject",
            label: t("Fan"),
            all: t("Barcha fanlar"),
            options: subjects.map((s) => (s.subject ? { value: s.subject, label: s.subject } : { value: "__none", label: t(NO_SUBJECT) })),
          },
          {
            name: "state",
            label: t("Holat"),
            all: t("Barcha holatlar"),
            options: [
              { value: "active", label: t("Faol") },
              { value: "inactive", label: t("Nofaol") },
              { value: "upcoming", label: t("Rejalashtirilgan") },
              { value: "open", label: t("Hozir ochiq") },
              { value: "closed", label: t("Yakunlangan") },
            ],
          },
          ...(staff.scope ? [] : [{ name: "university", label: t("Universitet"), all: t("Barcha universitetlar"), options: universities.map((u) => ({ value: u.id, label: u.name })) }]),
        ]}
      />
      {tests.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title={t("Testlar topilmadi")} description={t("Filtrni o'zgartiring yoki yangi test yarating.")} />
      ) : (
        <TestsTable groups={groups} canDelete={!staff.scope} />
      )}
    </>
  );
}
