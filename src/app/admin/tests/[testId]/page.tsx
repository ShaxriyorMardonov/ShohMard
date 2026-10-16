import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Lock, Megaphone, Pencil, Trash2, Undo2, Upload } from "lucide-react";
import { deleteTestAction, setResultsReleasedAction } from "@/actions/admin";
import { ImportDialog } from "@/components/admin/import-dialog";
import { TEST_STATE_BADGE } from "@/components/admin/test-state";
import { TestQuestions } from "@/components/admin/test-questions";
import { PageHeader } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUESTION_TYPE_LABEL, RESULT_RELEASE_LABEL, isResultReleased, testState } from "@/lib/exam-rules";
import { formatDateTime, formatDuration } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";

export const maxDuration = 60;

export default async function TestDetailPage({ params, searchParams }: { params: Promise<{ testId: string }>; searchParams: Promise<{ saved?: string }> }) {
  await requireAdmin();
  const { testId } = await params;
  const { saved } = await searchParams;
  await finalizeExpiredAttempts({ testId });
  const test = await prisma.test.findUnique({
    where: { id: testId },
    include: {
      universities: { select: { id: true, name: true } },
      questions: {
        orderBy: { position: "asc" },
        include: { question: { select: { id: true, text: true, subject: true, type: true } } },
      },
    },
  });
  if (!test) notFound();
  const [bank, stats, inProgress] = await Promise.all([
    prisma.question.findMany({ orderBy: { createdAt: "desc" }, take: 1000, select: { id: true, text: true, subject: true, type: true } }),
    prisma.attempt.aggregate({ where: { testId, status: "SUBMITTED" }, _count: true, _avg: { percent: true }, _max: { percent: true }, _min: { percent: true } }),
    prisma.attempt.count({ where: { testId, status: "IN_PROGRESS" } }),
  ]);
  const totalAttempts = stats._count + inProgress;
  const locked = totalAttempts > 0;
  const now = new Date();
  const st = TEST_STATE_BADGE[testState(test, now)];
  const released = isResultReleased(test, now);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/tests"><ArrowLeft /> Testlar</Link>
      </Button>
      <PageHeader
        title={test.title}
        description={test.subject ?? undefined}
        actions={
          <>
            <Button asChild variant="outline"><Link href={`/admin/results?test=${test.id}`}><BarChart3 /> Natijalar</Link></Button>
            <Button asChild><Link href={`/admin/tests/${test.id}/edit`}><Pencil /> Tahrirlash</Link></Button>
            <ConfirmAction
              trigger={<Button variant="outline" className="text-error" disabled={locked}><Trash2 /> O&apos;chirish</Button>}
              title="Testni o'chirish"
              description="Test butunlay o'chiriladi. Savollar bankdagi savollar saqlanib qoladi."
              confirmLabel="O'chirish"
              action={deleteTestAction.bind(null, test.id)}
            />
          </>
        }
      />
      {saved && <Alert variant="success" className="mb-4"><span>Test saqlandi.</span></Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Savollar</CardTitle>
            {!locked && (
              <ImportDialog
                kind="questions"
                testId={test.id}
                trigger={<Button size="sm" variant="outline"><Upload /> Word/Excel&apos;dan yuklash</Button>}
              />
            )}
          </CardHeader>
          <CardContent>
            {locked && (
              <Alert variant="info" className="mb-3">
                <Lock />
                <span>Talabalar testni boshlagan. Natijalar adolatli bo&apos;lishi uchun savollar tarkibi qulflangan.</span>
              </Alert>
            )}
            <TestQuestions
              testId={test.id}
              locked={locked}
              items={test.questions.map((tq) => ({
                id: tq.question.id,
                text: tq.question.text,
                subject: tq.question.subject,
                typeLabel: QUESTION_TYPE_LABEL[tq.question.type],
                points: tq.points,
              }))}
              bank={bank.map((q) => ({ id: q.id, text: q.text, subject: q.subject, typeLabel: QUESTION_TYPE_LABEL[q.type] }))}
            />
          </CardContent>
        </Card>
        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Ma&apos;lumotlar</CardTitle>
              <Badge variant={st.variant}>{st.label}</Badge>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2.5 text-sm">
                {[
                  ["Boshlanish", formatDateTime(test.startsAt)],
                  ["Tugash", formatDateTime(test.endsAt)],
                  ["Davomiylik", formatDuration(test.durationMinutes)],
                  ["O'tish chegarasi", `${test.passingPercent}%`],
                  ["Natija", RESULT_RELEASE_LABEL[test.resultRelease]],
                  ["Universitetlar", test.universities.map((u) => u.name).join(", ") || "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-semibold text-midnight">{v}</dd>
                  </div>
                ))}
              </dl>
              {test.description && <p className="mt-4 whitespace-pre-line border-t pt-3 text-sm text-muted-foreground">{test.description}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Statistika</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{stats._count}</p><p className="text-xs text-muted-foreground">Topshirilgan</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{inProgress}</p><p className="text-xs text-muted-foreground">Jarayonda</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{stats._avg.percent === null ? "—" : `${stats._avg.percent.toFixed(1)}%`}</p><p className="text-xs text-muted-foreground">O&apos;rtacha</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{stats._max.percent === null ? "—" : `${stats._min.percent}–${stats._max.percent}%`}</p><p className="text-xs text-muted-foreground">Oraliq</p></div>
              </div>
              <p className="text-muted-foreground">
                Talabalar uchun natija holati: <b className="text-midnight">{released ? "e'lon qilingan" : "e'lon qilinmagan"}</b>
              </p>
              {test.resultRelease === "MANUAL" &&
                (test.resultsReleasedAt ? (
                  <ConfirmAction
                    trigger={<Button variant="outline"><Undo2 /> E&apos;lonni bekor qilish</Button>}
                    title="Natijalarni yashirish"
                    description="Talabalar natija va to'g'ri javoblarni ko'ra olmaydi."
                    confirmLabel="Yashirish"
                    action={setResultsReleasedAction.bind(null, test.id, false)}
                  />
                ) : (
                  <ConfirmAction
                    trigger={<Button variant="success"><Megaphone /> Natijalarni e&apos;lon qilish</Button>}
                    title="Natijalarni e'lon qilish"
                    description="Talabalar o'z ballari va to'g'ri javoblarni ko'ra oladi. Agar test hali davom etayotgan bo'lsa, javoblar boshqalarga tarqalishi mumkin."
                    confirmLabel="E'lon qilish"
                    variant="default"
                    action={setResultsReleasedAction.bind(null, test.id, true)}
                  />
                ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
