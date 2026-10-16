import { BarChart3, FileSpreadsheet, FileText } from "lucide-react";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { ResultsTable } from "@/components/admin/results-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STUDY_FORMS, studyFormLabel } from "@/lib/labels";
import { getT } from "@/i18n/server";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";
import { orgOptions } from "@/server/filters";
import { RESULT_FILTER_KEYS, resultSelect, resultsWhere, type ResultFilters } from "@/server/results";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Natijalar") };
}
const PER_PAGE = 30;

export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<ResultFilters & { page?: string }> }) {
  await requireAdmin();
  const { t, lang } = await getT();
  await finalizeExpiredAttempts();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const where = await resultsWhere(sp);
  const [tests, subjects, options, total, agg, passedCount, rows] = await Promise.all([
    prisma.test.findMany({
      where: sp.subject ? { subject: sp.subject === "__none" ? null : sp.subject } : {},
      orderBy: { startsAt: "desc" },
      select: { id: true, title: true },
    }),
    prisma.test.findMany({ distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
    orgOptions(null, sp),
    prisma.attempt.count({ where }),
    prisma.attempt.aggregate({ where, _avg: { percent: true } }),
    sp.status ? Promise.resolve(null) : resultsWhere({ ...sp, status: "passed" }).then((w) => prisma.attempt.count({ where: w })),
    prisma.attempt.findMany({ where, orderBy: { submittedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: resultSelect }),
  ]);
  const params: Record<string, string | undefined> = {};
  for (const k of RESULT_FILTER_KEYS) params[k] = sp[k];
  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) exportParams.set(k, v);
  const csvParams = new URLSearchParams(exportParams);
  csvParams.set("format", "csv");

  const summary = [
    t("Topshirilgan: {n}", { n: total }),
    agg._avg.percent !== null ? t("o'rtacha {p}%", { p: agg._avg.percent.toFixed(1) }) : null,
    passedCount !== null && total ? t("o'tganlar {n} ({p}%)", { n: passedCount, p: Math.round((passedCount / total) * 100) }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title={t("Natijalar")}
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
        search={{ placeholder: t("Talaba ismi yoki logini") }}
        values={sp}
        fields={[
          {
            name: "subject",
            label: t("Fan"),
            all: t("Barcha fanlar"),
            options: subjects.map((s) => (s.subject ? { value: s.subject, label: s.subject } : { value: "__none", label: t("Fan ko'rsatilmagan") })),
            resets: ["test"],
          },
          { name: "test", label: t("Test"), all: t("Barcha testlar"), options: tests.map((x) => ({ value: x.id, label: x.title })) },
          { name: "university", label: t("Universitet"), all: t("Barcha universitetlar"), options: options.universities, resets: ["faculty", "group"] },
          { name: "faculty", label: t("Fakultet"), all: t("Barcha fakultetlar"), options: options.faculties, resets: ["group"] },
          { name: "group", label: t("Guruh"), all: t("Barcha guruhlar"), options: options.groups },
          { name: "form", label: t("Ta'lim shakli"), all: t("Barcha ta'lim shakllari"), options: STUDY_FORMS.map((f) => ({ ...f, label: t(f.label) })) },
          {
            name: "status",
            label: t("Natija"),
            all: t("O'tgan va o'tmaganlar"),
            options: [
              { value: "passed", label: t("Faqat o'tganlar") },
              { value: "failed", label: t("Faqat o'tmaganlar") },
            ],
          },
          { type: "date", name: "from", label: t("Sanadan") },
          { type: "date", name: "to", label: t("Sanagacha") },
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
              university: r.user.university?.shortName ?? "—",
              org: [r.user.faculty?.name, r.user.group?.name, r.user.studyForm ? t(studyFormLabel(r.user.studyForm)) : null].filter(Boolean).join(" · "),
              testTitle: r.test.title,
              subject: r.test.subject,
              attemptNo: r.attemptNo,
              submitted: formatDateTime(r.submittedAt, lang),
              auto: r.autoSubmitted,
              score: `${r.score}/${r.maxScore}`,
              percent: r.percent,
              passed: (r.percent ?? 0) >= r.test.passingPercent,
            }))}
          />
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={params} />
        </Card>
      )}
    </>
  );
}
