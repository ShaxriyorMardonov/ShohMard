import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Trophy } from "lucide-react";
import { OlympiadTabs } from "@/components/admin/olympiad-tabs";
import { TestsTable, type TestListRow } from "@/components/admin/tests-table";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { testState } from "@/lib/exam-rules";
import { OLYMPIAD, parseOlympiadSlug } from "@/lib/olympiad";
import { formatDateTime, formatDuration } from "@/lib/time";

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }) {
  const { t } = await getT();
  const slug = parseOlympiadSlug((await params).kind);
  return { title: slug ? t(OLYMPIAD[slug].title) : t("Olimpiadalar") };
}

export default async function OlympiadTestsPage({ params }: { params: Promise<{ kind: string }> }) {
  await requireAdmin();
  const slug = parseOlympiadSlug((await params).kind);
  if (!slug) notFound();
  const { t, lang } = await getT();
  const o = OLYMPIAD[slug];
  const now = new Date();
  const tests = await prisma.test.findMany({
    where: { kind: o.kind },
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });
  const rows: TestListRow[] = tests.map((x) => ({
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
    universities: t("Hamma uchun ochiq"),
  }));
  const base = `/admin/olympiads/${slug}`;
  return (
    <>
      <OlympiadTabs slug={slug} active="tests" />
      <PageHeader
        title={t(o.title)}
        description={t("100 ballik tizim · jami {n} ta olimpiada", { n: tests.length })}
        actions={<Button asChild><Link href={`${base}/new`}><Plus /> {t("Yangi olimpiada")}</Link></Button>}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Trophy />} title={t("Olimpiadalar hali yo'q")} description={t("Yangi olimpiada yarating va savollarni Word yoki Excel fayldan yuklang.")} />
      ) : (
        <TestsTable groups={[{ subject: t(o.title), rows }]} canDelete basePath={base} />
      )}
    </>
  );
}
