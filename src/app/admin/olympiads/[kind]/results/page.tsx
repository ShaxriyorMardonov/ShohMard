import { notFound } from "next/navigation";
import { BarChart3, FileSpreadsheet, FileText } from "lucide-react";
import { FilterBar } from "@/components/admin/filter-bar";
import { OlympiadTabs } from "@/components/admin/olympiad-tabs";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { ResultsTable } from "@/components/admin/results-table";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OLYMPIAD, parseOlympiadSlug } from "@/lib/olympiad";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";
import { resultSelect, resultsWhere } from "@/server/results";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Olimpiada natijalari") };
}
const PER_PAGE = 30;

type SP = { q?: string; test?: string; who?: string; page?: string };

export default async function OlympiadResultsPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<SP> }) {
  await requireAdmin();
  const slug = parseOlympiadSlug((await params).kind);
  if (!slug) notFound();
  const { t, lang } = await getT();
  const o = OLYMPIAD[slug];
  await finalizeExpiredAttempts();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const base = await resultsWhere({ kind: slug, q: sp.q, test: sp.test });
  // Ishtirokchi turi: tizimdagi talabalar yoki ro'yxatdan o'tganlar
  const who = sp.who === "students" ? { user: { roles: { has: "STUDENT" as const } } } : sp.who === "guests" ? { user: { roles: { has: "PARTICIPANT" as const } } } : {};
  const where = { AND: [base, who] };
  const [tests, total, agg, rows] = await Promise.all([
    prisma.test.findMany({ where: { kind: o.kind }, orderBy: { startsAt: "desc" }, select: { id: true, title: true } }),
    prisma.attempt.count({ where }),
    prisma.attempt.aggregate({ where, _avg: { percent: true } }),
    prisma.attempt.findMany({ where, orderBy: [{ percent: "desc" }, { submittedAt: "asc" }], skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: resultSelect }),
  ]);
  const params2: Record<string, string | undefined> = { q: sp.q, test: sp.test, who: sp.who };
  const exportParams = new URLSearchParams({ kind: slug });
  if (sp.q) exportParams.set("q", sp.q);
  if (sp.test) exportParams.set("test", sp.test);
  const csvParams = new URLSearchParams(exportParams);
  csvParams.set("format", "csv");
  const summary = [
    t("Topshirilgan: {n}", { n: total }),
    agg._avg.percent !== null ? t("o'rtacha {p}%", { p: agg._avg.percent.toFixed(1) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <OlympiadTabs slug={slug} active="results" />
      <PageHeader
        title={t("{name}: natijalar", { name: t(o.title) })}
        description={summary}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/admin/results/export?${csvParams.toString()}`} download><FileText /> CSV</a>
            </Button>
            <Button asChild variant="success">
              <a href={`/admin/results/export?${exportParams.toString()}`} download><FileSpreadsheet /> {t("Excel jadval")}</a>
            </Button>
          </>
        }
      />
      <FilterBar
        search={{ placeholder: t("Ishtirokchi ismi yoki logini") }}
        values={sp}
        fields={[
          { name: "test", label: t("Olimpiada"), all: t("Barcha olimpiadalar"), options: tests.map((x) => ({ value: x.id, label: x.title })) },
          {
            name: "who",
            label: t("Ishtirokchilar"),
            all: t("Barcha ishtirokchilar"),
            options: [
              { value: "students", label: t("Tizimdagi talabalar") },
              { value: "guests", label: t("Ro'yxatdan o'tganlar") },
            ],
          },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title={t("Natijalar topilmadi")} />
      ) : (
        <Card className="overflow-hidden">
          <ResultsTable
            rows={rows.map((r) => ({
              id: r.id,
              fullName: r.user.fullName,
              login: r.user.login,
              university: r.user.university?.shortName ?? r.user.organization ?? "—",
              org: [r.user.faculty?.name, r.user.group?.name, r.user.phone].filter(Boolean).join(" · "),
              testTitle: r.test.title,
              subject: r.test.subject,
              attemptNo: r.attemptNo,
              submitted: formatDateTime(r.submittedAt, lang),
              auto: r.autoSubmitted,
              score: `${r.score}/${r.maxScore}`,
              percent: r.percent,
              passed: (r.percent ?? 0) >= r.test.passingPercent,
              flags: { tab: r.tabSwitches, copy: r.copyEvents, device: r.deviceChanges },
              kind: r.test.kind,
            }))}
          />
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={params2} />
        </Card>
      )}
    </>
  );
}
