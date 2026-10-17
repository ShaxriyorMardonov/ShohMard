import Link from "next/link";
import { GradeBadge } from "@/components/grade-badge";
import { Activity, BarChart3, Building2, ClipboardList, Trophy, Users } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getT } from "@/i18n/server";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";

export default async function AdminDashboard() {
  const admin = await requireAdmin();
  const { t, lang } = await getT();
  await finalizeExpiredAttempts();
  const now = new Date();

  const [universities, students, publishedTests, openTests, submitted, inProgress, top, recent, uniStats, upcoming] =
    await Promise.all([
      prisma.university.count(),
      prisma.user.count({ where: { roles: { has: "STUDENT" }, isActive: true } }),
      prisma.test.count({ where: { kind: "REGULAR", isPublished: true } }),
      prisma.test.count({ where: { kind: "REGULAR", isPublished: true, startsAt: { lte: now }, endsAt: { gt: now } } }),
      prisma.attempt.count({ where: { status: "SUBMITTED", test: { kind: "REGULAR" } } }),
      prisma.attempt.count({ where: { status: "IN_PROGRESS", test: { kind: "REGULAR" } } }),
      // Har bir test bo'yicha eng yaxshi urinish, so'ng talabaning o'rtacha foizi
      prisma.$queryRaw<{ id: string; fullName: string; shortName: string | null; tests: bigint; avg: number }[]>`
        SELECT s."id", s."fullName", un."shortName", COUNT(*) AS tests, AVG(b.best) AS avg
        FROM (
          SELECT a."userId", a."testId", MAX(a."percent") AS best FROM "Attempt" a
          JOIN "Test" t ON t."id" = a."testId" AND t."kind" = 'REGULAR'
          WHERE a."status" = 'SUBMITTED' AND a."percent" IS NOT NULL GROUP BY a."userId", a."testId"
        ) b
        JOIN "User" s ON s."id" = b."userId"
        LEFT JOIN "University" un ON un."id" = s."universityId"
        GROUP BY s."id", s."fullName", un."shortName"
        ORDER BY avg DESC, tests DESC, s."fullName" ASC
        LIMIT 10`,
      prisma.attempt.findMany({
        where: { status: "SUBMITTED", test: { kind: "REGULAR" } },
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
          (SELECT COUNT(*) FROM "User" s WHERE s."universityId" = u."id" AND 'STUDENT' = ANY(s."roles")) AS students,
          (SELECT AVG(a."percent") FROM "Attempt" a JOIN "User" s ON s."id" = a."userId"
             JOIN "Test" t ON t."id" = a."testId" AND t."kind" = 'REGULAR'
             WHERE s."universityId" = u."id" AND a."status" = 'SUBMITTED') AS avg
        FROM "University" u ORDER BY u."shortName"`,
      prisma.test.findMany({
        where: { kind: "REGULAR", isPublished: true, endsAt: { gt: now } },
        orderBy: { startsAt: "asc" },
        take: 5,
        select: { id: true, title: true, startsAt: true, endsAt: true, _count: { select: { attempts: true } } },
      }),
    ]);

  return (
    <>
      <PageHeader
        title={t("Xush kelibsiz, {name}", { name: admin.fullName })}
        description={t("SAMU platformasining umumiy holati")}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label={t("Universitetlar")} value={universities} icon={<Building2 />} tone="midnight" />
        <StatCard label={t("Faol talabalar")} value={students} icon={<Users />} />
        <StatCard label={t("Faol testlar")} value={publishedTests} hint={t("Hozir ochiq: {n}", { n: openTests })} icon={<ClipboardList />} tone="warning" />
        <StatCard label={t("Topshirilgan urinishlar")} value={submitted} icon={<BarChart3 />} tone="success" />
        <StatCard label={t("Hozir imtihonda")} value={inProgress} icon={<Activity />} tone="warning" />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2"><Trophy className="size-5 text-warning" /> {t("Top 10 talaba")}</CardTitle>
            <span className="text-xs text-muted-foreground">{t("Har bir testdagi eng yaxshi natija bo'yicha o'rtacha")}</span>
          </CardHeader>
          {top.length === 0 ? (
            <CardContent>
              <EmptyState icon={<Trophy />} title={t("Hali natijalar yo'q")} />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">№</TableHead>
                  <TableHead>{t("Talaba")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("Testlar")}</TableHead>
                  <TableHead className="text-right">{t("O'rtacha")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {top.map((s, i) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <span className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-bold ${i < 3 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-midnight">{s.fullName}</span>
                      <span className="block text-xs text-muted-foreground">{s.shortName ?? "—"}</span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{Number(s.tests)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="success">{Number(s.avg).toFixed(1)}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{t("So'nggi natijalar")}</CardTitle>
            <Link href="/admin/results" className="text-sm font-semibold text-royal hover:underline">{t("Barchasi")}</Link>
          </CardHeader>
          {recent.length === 0 ? (
            <CardContent>
              <EmptyState icon={<BarChart3 />} title={t("Hali natijalar yo'q")} />
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Talaba")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("Test")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("Vaqt")}</TableHead>
                  <TableHead className="text-right">{t("Natija")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link href={`/admin/results/${r.id}`} className="font-semibold text-midnight hover:text-royal">{r.user.fullName}</Link>
                      <span className="block text-xs text-muted-foreground">{r.user.university?.shortName}</span>
                      <span className="mt-0.5 block text-xs text-midnight sm:hidden">{r.test.title}</span>
                      <span className="block text-xs text-muted-foreground md:hidden">{formatDateTime(r.submittedAt, lang)}</span>
                    </TableCell>
                    <TableCell className="hidden max-w-[220px] truncate sm:table-cell">{r.test.title}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">{formatDateTime(r.submittedAt, lang)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end justify-end gap-1.5 sm:flex-row">
                        <Badge variant={(r.percent ?? 0) >= r.test.passingPercent ? "success" : "error"}>{r.percent}%</Badge>
                        <GradeBadge percent={r.percent} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("Universitetlar kesimida")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {uniStats.length === 0 && <p className="text-sm text-muted-foreground">{t("Universitetlar hali qo'shilmagan.")}</p>}
              {uniStats.map((u) => {
                const pct = u.avg === null ? 0 : Number(u.avg);
                return (
                  <div key={u.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-midnight">{u.shortName}</span>
                      <span className="text-muted-foreground">
                        {t("{n} talaba", { n: Number(u.students) })} · {u.avg === null ? t("natija yo'q") : `${pct.toFixed(1)}%`}
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
              <CardTitle>{t("Faol va yaqin testlar")}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Faol yoki rejalashtirilgan testlar yo'q.")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((test) => {
                    const open = test.startsAt <= now;
                    return (
                      <li key={test.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <Link href={`/admin/tests/${test.id}`} className="block truncate text-sm font-semibold text-midnight hover:text-royal">{test.title}</Link>
                          <p className="text-xs text-muted-foreground">{open ? t("Tugashi: {date}", { date: formatDateTime(test.endsAt, lang) }) : t("Boshlanishi: {date}", { date: formatDateTime(test.startsAt, lang) })}</p>
                        </div>
                        <Badge variant={open ? "success" : "muted"}>{open ? t("Ochiq · {n}", { n: test._count.attempts }) : t("Kutilmoqda")}</Badge>
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
