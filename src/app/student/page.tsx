import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarClock, CheckCircle2, Clock, Target } from "lucide-react";
import { EmptyState, StatCard } from "@/components/layout/app-shell";
import { TestAction, TestCard, TestStatusBadge } from "@/components/student/test-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { getStudentAttempts, getStudentTests } from "@/server/student";

function greeting(date = new Date()) {
  const h = (date.getUTCHours() + 5) % 24; // Toshkent vaqti
  if (h < 6) return "Xayrli tun";
  if (h < 12) return "Xayrli tong";
  if (h < 18) return "Xayrli kun";
  return "Xayrli kech";
}

export default async function StudentDashboard() {
  const user = await requireStudent();
  const [tests, attempts] = await Promise.all([
    getStudentTests(user.id, user.university.id),
    getStudentAttempts(user.id),
  ]);

  const actionable = tests.filter((t) => t.status === "open" || t.status === "in_progress");
  const upcoming = tests.filter((t) => t.status === "upcoming").slice(0, 5);
  const completed = attempts.filter((a) => a.status === "SUBMITTED");
  const released = completed.filter((a) => a.released && a.percent !== null);
  const avg = released.length ? released.reduce((s, a) => s + (a.percent ?? 0), 0) / released.length : null;
  const firstName = user.fullName.split(/\s+/)[1] ?? user.fullName.split(/\s+/)[0];

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-2xl bg-midnight p-6 text-white sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-72 rounded-full border-[36px] border-white/[0.05]" />
        <p className="text-sm font-medium text-[#9DB4EC]">{greeting()},</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{firstName}!</h1>
        <p className="mt-2 max-w-xl text-sm text-white/75">
          {user.fullName} · {user.university.name}
          {user.groupName ? ` · ${user.groupName}-guruh` : ""}
        </p>
        <p className="mt-4 text-sm text-white/85">
          {actionable.length > 0
            ? `Sizda hozir ${actionable.length} ta topshirish mumkin bo'lgan test bor.`
            : "Hozircha ochiq testlar yo'q. Yaqinlashayotgan imtihonlarni kuzatib boring."}
        </p>
        {actionable[0] && (
          <div className="mt-5">
            <TestAction test={actionable[0]} size="default" />
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Mavjud testlar" value={actionable.length} hint="Hozir topshirish mumkin" icon={<BookOpenCheck />} />
        <StatCard label="Topshirilgan testlar" value={completed.length} hint="Jami yakunlangan" icon={<CheckCircle2 />} tone="success" />
        <StatCard
          label="O'rtacha ball"
          value={avg === null ? "—" : `${avg.toFixed(1)}%`}
          hint={released.length ? `${released.length} ta e'lon qilingan natija asosida` : "E'lon qilingan natijalar yo'q"}
          icon={<Target />}
          tone="warning"
        />
      </section>

      {actionable.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-midnight">Topshirish mumkin bo&apos;lgan testlar</h2>
            <Link href="/student/tests" className="text-sm font-semibold text-royal hover:underline">
              Barchasi
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {actionable.slice(0, 3).map((t) => (
              <TestCard key={t.id} test={t} />
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>So&apos;nggi testlar</CardTitle>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link href="/student/history">
                Tarix <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <EmptyState icon={<Clock />} title="Hali test topshirmagansiz" description="Topshirgan testlaringiz shu yerda ko'rinadi." />
            ) : (
              <ul className="divide-y divide-border">
                {attempts.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-midnight">{a.test.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(a.submittedAt ?? a.startedAt)}</p>
                    </div>
                    {a.status === "IN_PROGRESS" ? (
                      <Badge variant="warning">Davom etmoqda</Badge>
                    ) : a.released && a.percent !== null ? (
                      <Link href={`/student/results/${a.id}`}>
                        <Badge variant={a.percent >= a.test.passingPercent ? "success" : "error"}>{a.percent}%</Badge>
                      </Link>
                    ) : (
                      <Badge variant="muted">Natija kutilmoqda</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yaqinlashayotgan imtihonlar</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState icon={<CalendarClock />} title="Rejalashtirilgan imtihonlar yo'q" description="Yangi imtihonlar e'lon qilinganda shu yerda ko'rinadi." />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-midnight">{t.title}</p>
                      <p className="text-xs text-muted-foreground">Boshlanishi: {formatDateTime(t.startsAt)}</p>
                    </div>
                    <TestStatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
