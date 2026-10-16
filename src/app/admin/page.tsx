import Link from "next/link";
import { Activity, BarChart3, Building2, ClipboardList, Library, Plus, Users } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  await finalizeExpiredAttempts();
  const now = new Date();

  const [universities, students, publishedTests, openTests, questions, submitted, inProgress, avg, recent, uniStats, upcoming] =
    await Promise.all([
      prisma.university.count(),
      prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
      prisma.test.count({ where: { isPublished: true } }),
      prisma.test.count({ where: { isPublished: true, startsAt: { lte: now }, endsAt: { gt: now } } }),
      prisma.question.count(),
      prisma.attempt.count({ where: { status: "SUBMITTED" } }),
      prisma.attempt.count({ where: { status: "IN_PROGRESS" } }),
      prisma.attempt.aggregate({ where: { status: "SUBMITTED" }, _avg: { percent: true } }),
      prisma.attempt.findMany({
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 8,
        select: {
          id: true,
          percent: true,
          submittedAt: true,
          user: { select: { fullName: true, university: { select: { shortName: true } } } },
          test: { select: { title: true, passingPercent: true } },
        },
      }),
      prisma.$queryRaw<{ id: string; shortName: string; students: bigint; avg: number | null }[]>`
        SELECT u."id", u."shortName",
          (SELECT COUNT(*) FROM "User" s WHERE s."universityId" = u."id" AND s."role" = 'STUDENT') AS students,
          (SELECT AVG(a."percent") FROM "Attempt" a JOIN "User" s ON s."id" = a."userId"
             WHERE s."universityId" = u."id" AND a."status" = 'SUBMITTED') AS avg
        FROM "University" u ORDER BY u."shortName"`,
      prisma.test.findMany({
        where: { isPublished: true, endsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: { id: true, title: true, startsAt: true, endsAt: true, _count: { select: { attempts: true } } },
      }),
    ]);

  return (
    <>
      <PageHeader
        title={`Xush kelibsiz, ${admin.fullName}`}
        description="SAMU platformasining umumiy holati"
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/questions/new"><Plus /> Savol</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/tests/new"><Plus /> Yangi test</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Universitetlar" value={universities} icon={<Building2 />} tone="midnight" />
        <StatCard label="Faol talabalar" value={students} icon={<Users />} />
        <StatCard label="Faol testlar" value={publishedTests} hint={`Hozir ochiq: ${openTests}`} icon={<ClipboardList />} tone="warning" />
        <StatCard label="Savollar banki" value={questions} icon={<Library />} tone="success" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Topshirilgan urinishlar" value={submitted} icon={<BarChart3 />} tone="success" />
        <StatCard label="Hozir imtihonda" value={inProgress} icon={<Activity />} tone="warning" />
        <StatCard label="O'rtacha natija" value={avg._avg.percent === null ? "—" : `${avg._avg.percent.toFixed(1)}%`} icon={<BarChart3 />} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>So&apos;nggi natijalar</CardTitle>
            <Link href="/admin/results" className="text-sm font-semibold text-royal hover:underline">Barchasi</Link>
          </CardHeader>
          {recent.length === 0 ? (
            <CardContent>
              <EmptyState icon={<BarChart3 />} title="Hali natijalar yo'q" />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Talaba</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Vaqt</TableHead>
                  <TableHead className="text-right">Natija</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/admin/results/${r.id}`} className="font-semibold text-midnight hover:text-royal">{r.user.fullName}</Link>
                      <span className="block text-xs text-muted-foreground">{r.user.university?.shortName}</span>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate">{r.test.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(r.submittedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(r.percent ?? 0) >= r.test.passingPercent ? "success" : "error"}>{r.percent}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Universitetlar kesimida</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {uniStats.length === 0 && <p className="text-sm text-muted-foreground">Universitetlar hali qo&apos;shilmagan.</p>}
              {uniStats.map((u) => {
                const pct = u.avg === null ? 0 : Number(u.avg);
                return (
                  <div key={u.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-midnight">{u.shortName}</span>
                      <span className="text-muted-foreground">
                        {Number(u.students)} talaba · {u.avg === null ? "natija yo'q" : `${pct.toFixed(1)}%`}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-royal" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Faol va yaqin testlar</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">Faol yoki rejalashtirilgan testlar yo&apos;q.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((t) => {
                    const open = t.startsAt <= now;
                    return (
                      <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <Link href={`/admin/tests/${t.id}`} className="block truncate text-sm font-semibold text-midnight hover:text-royal">{t.title}</Link>
                          <p className="text-xs text-muted-foreground">{open ? `Tugashi: ${formatDateTime(t.endsAt)}` : `Boshlanishi: ${formatDateTime(t.startsAt)}`}</p>
                        </div>
                        <Badge variant={open ? "success" : "muted"}>{open ? `Ochiq · ${t._count.attempts}` : "Kutilmoqda"}</Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
