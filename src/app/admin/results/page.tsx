import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, FileSpreadsheet, FileText } from "lucide-react";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STUDY_FORMS, studyFormLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";
import { orgOptions } from "@/server/filters";
import { RESULT_FILTER_KEYS, resultSelect, resultsWhere, type ResultFilters } from "@/server/results";

export const metadata: Metadata = { title: "Natijalar" };
const PER_PAGE = 30;

export default async function AdminResultsPage({ searchParams }: { searchParams: Promise<ResultFilters & { page?: string }> }) {
  await requireAdmin();
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
    `Topshirilgan: ${total}`,
    agg._avg.percent !== null ? `o'rtacha ${agg._avg.percent.toFixed(1)}%` : null,
    passedCount !== null && total ? `o'tganlar ${passedCount} (${Math.round((passedCount / total) * 100)}%)` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        title="Natijalar"
        description={summary}
        actions={
          <>
            <Button asChild variant="outline">
              <a href={`/admin/results/export?${csvParams.toString()}`} download><FileText /> CSV</a>
            </Button>
            <Button asChild variant="success">
              <a href={`/admin/results/export?${exportParams.toString()}`} download><FileSpreadsheet /> Excel jadval</a>
            </Button>
          </>
        }
      />
      <FilterBar
        search={{ placeholder: "Talaba ismi yoki logini" }}
        values={sp}
        fields={[
          {
            name: "subject",
            label: "Fan",
            all: "Barcha fanlar",
            options: subjects.map((s) => (s.subject ? { value: s.subject, label: s.subject } : { value: "__none", label: "Fan ko'rsatilmagan" })),
            resets: ["test"],
          },
          { name: "test", label: "Test", all: "Barcha testlar", options: tests.map((t) => ({ value: t.id, label: t.title })) },
          { name: "university", label: "Universitet", all: "Barcha universitetlar", options: options.universities, resets: ["faculty", "group"] },
          { name: "faculty", label: "Fakultet", all: "Barcha fakultetlar", options: options.faculties, resets: ["group"] },
          { name: "group", label: "Guruh", all: "Barcha guruhlar", options: options.groups },
          { name: "form", label: "Ta'lim shakli", all: "Barcha ta'lim shakllari", options: STUDY_FORMS },
          {
            name: "status",
            label: "Natija",
            all: "O'tgan va o'tmaganlar",
            options: [
              { value: "passed", label: "Faqat o'tganlar" },
              { value: "failed", label: "Faqat o'tmaganlar" },
            ],
          },
          { type: "date", name: "from", label: "Sanadan" },
          { type: "date", name: "to", label: "Sanagacha" },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="Natijalar topilmadi" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Talaba</TableHead>
                <TableHead>Universitet / guruh</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Topshirilgan</TableHead>
                <TableHead>Ball</TableHead>
                <TableHead className="text-right">Natija</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/admin/results/${r.id}`} className="font-semibold text-midnight hover:text-royal">{r.user.fullName}</Link>
                    <span className="block font-mono text-xs text-muted-foreground">{r.user.login}</span>
                  </TableCell>
                  <TableCell>
                    {r.user.university?.shortName ?? "—"}
                    <span className="block text-xs text-muted-foreground">
                      {[r.user.faculty?.name, r.user.group?.name, r.user.studyForm ? studyFormLabel(r.user.studyForm) : null].filter(Boolean).join(" · ")}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <span className="line-clamp-2">{r.test.title}</span>
                    {r.test.subject && <span className="block text-xs text-muted-foreground">{r.test.subject}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(r.submittedAt)}
                    {r.autoSubmitted && <span className="block text-xs">avtomatik</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{r.score}/{r.maxScore}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={(r.percent ?? 0) >= r.test.passingPercent ? "success" : "error"}>{r.percent}%</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={params} />
        </Card>
      )}
    </>
  );
}
