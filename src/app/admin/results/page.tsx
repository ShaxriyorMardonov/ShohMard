import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Download, Search } from "lucide-react";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";
import { resultSelect, resultsWhere } from "@/server/results";

export const metadata: Metadata = { title: "Natijalar" };
const PER_PAGE = 30;

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ test?: string; university?: string; q?: string; page?: string }>;
}) {
  await requireAdmin();
  await finalizeExpiredAttempts();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const where = resultsWhere(sp);
  const [tests, universities, total, agg, rows] = await Promise.all([
    prisma.test.findMany({ orderBy: { startsAt: "desc" }, select: { id: true, title: true } }),
    prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.attempt.count({ where }),
    prisma.attempt.aggregate({ where, _avg: { percent: true } }),
    prisma.attempt.findMany({ where, orderBy: { submittedAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: resultSelect }),
  ]);
  const exportParams = new URLSearchParams();
  for (const k of ["test", "university", "q"] as const) if (sp[k]) exportParams.set(k, sp[k]!);

  return (
    <>
      <PageHeader
        title="Natijalar"
        description={`Topshirilgan urinishlar: ${total}${agg._avg.percent !== null ? ` · o'rtacha ${agg._avg.percent.toFixed(1)}%` : ""}`}
        actions={
          <Button asChild variant="success">
            <a href={`/admin/results/export?${exportParams.toString()}`} download>
              <Download /> CSV yuklab olish
            </a>
          </Button>
        }
      />
      <form className="mb-4 grid gap-3 md:grid-cols-[1fr_220px_220px_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={sp.q} placeholder="Talaba ismi yoki logini" className="pl-9" aria-label="Qidirish" />
        </div>
        <NativeSelect name="test" defaultValue={sp.test ?? ""} aria-label="Test">
          <option value="">Barcha testlar</option>
          {tests.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </NativeSelect>
        <NativeSelect name="university" defaultValue={sp.university ?? ""} aria-label="Universitet">
          <option value="">Barcha universitetlar</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="midnight">Filtrlash</Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="Natijalar topilmadi" />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Talaba</TableHead>
                <TableHead>Universitet</TableHead>
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
                  <TableCell>{r.user.university?.shortName ?? "—"}{r.user.groupName && <span className="block text-xs text-muted-foreground">{r.user.groupName}</span>}</TableCell>
                  <TableCell className="max-w-[240px]"><span className="line-clamp-2">{r.test.title}</span></TableCell>
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
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={{ test: sp.test, university: sp.university, q: sp.q }} />
        </Card>
      )}
    </>
  );
}
