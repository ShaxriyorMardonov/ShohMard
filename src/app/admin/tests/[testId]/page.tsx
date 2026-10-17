import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BarChart3, Lock, Megaphone, Pencil, Trash2, Undo2, Upload } from "lucide-react";
import { deleteTestAction, setResultsReleasedAction } from "@/actions/admin";
import { ImportDialog } from "@/components/admin/import-dialog";
import { EndTestButton } from "@/components/admin/live-warning";
import { WordImportDialog } from "@/components/admin/word-import-dialog";
import { TEST_STATE_BADGE } from "@/components/admin/test-state";
import { TestQuestions } from "@/components/admin/test-questions";
import { TestAccessCard } from "@/components/admin/test-access";
import { TestScheduleCard } from "@/components/admin/test-schedule";
import { ActiveSwitch } from "@/components/admin/tests-table";
import { PageHeader } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { getT } from "@/i18n/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUESTION_TYPE_LABEL, RESULT_RELEASE_LABEL, isResultReleased, testState } from "@/lib/exam-rules";
import { formatDateTime, formatDuration, toLocalInput } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";
import { testScopeWhere } from "@/server/org";
import { OLYMPIAD, isOlympiad, slugOf, testBasePath } from "@/lib/olympiad";

export const maxDuration = 60;

export default async function TestDetailPage({ params, searchParams }: { params: Promise<{ testId: string; kind?: string }>; searchParams: Promise<{ saved?: string }> }) {
  const staff = await requireStaff();
  const { t, lang } = await getT();
  const isAdmin = !staff.scope;
  const { testId, kind: slug } = await params;
  const { saved } = await searchParams;
  await finalizeExpiredAttempts({ testId });
  const test = await prisma.test.findFirst({
    where: { id: testId, ...testScopeWhere(staff.scope) },
    include: {
      universities: { select: { id: true, name: true, shortName: true } },
      _count: { select: { access: true } },
      questions: {
        orderBy: { position: "asc" },
        include: { question: { select: { id: true, text: true, subject: true, type: true } } },
      },
    },
  });
  if (!test) notFound();
  const olympiad = isOlympiad(test.kind);
  // Olimpiada testi o'z bo'limida ochiladi (menyu ham shunga mos belgilanadi)
  if (slugOf(test.kind) !== slug) redirect(`${testBasePath(test.kind)}/${test.id}`);
  const base = testBasePath(test.kind);
  const uniIds = test.universities.map((u) => u.id);
  const [bank, stats, inProgress, groups, faculties] = await Promise.all([
    prisma.question.findMany({ orderBy: { createdAt: "desc" }, take: 1000, select: { id: true, text: true, subject: true, type: true } }),
    prisma.attempt.aggregate({ where: { testId, status: "SUBMITTED" }, _count: true, _avg: { percent: true }, _max: { percent: true }, _min: { percent: true } }),
    prisma.attempt.count({ where: { testId, status: "IN_PROGRESS" } }),
    prisma.group.findMany({ where: { universityId: { in: uniIds } }, orderBy: { name: "asc" }, select: { id: true, name: true, universityId: true, facultyId: true } }),
    prisma.faculty.findMany({ where: { universityId: { in: uniIds } }, orderBy: { name: "asc" }, select: { id: true, name: true, universityId: true } }),
  ]);
  const totalAttempts = stats._count + inProgress;
  // Bitta talabaga tushadigan savollar ballari (taxminiy: birinchi N ta savol bo'yicha)
  const perAttempt = test.questionsPerAttempt && test.questionsPerAttempt < test.questions.length ? test.questionsPerAttempt : test.questions.length;
  const rawMax = test.questions.slice(0, perAttempt).reduce((n, q) => n + q.points, 0);
  const locked = totalAttempts > 0;
  const now = new Date();
  const st = TEST_STATE_BADGE[testState(test, now)];
  const released = isResultReleased(test, now);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href={base}><ArrowLeft /> {olympiad ? t(OLYMPIAD[slugOf(test.kind)!].title) : t("Testlar")}</Link>
      </Button>
      <PageHeader
        title={test.title}
        description={test.subject ?? undefined}
        actions={
          <>
            {isAdmin && <Button asChild variant="outline"><Link href={olympiad ? `${base}/results?test=${test.id}` : `/admin/results?test=${test.id}`}><BarChart3 /> {t("Natijalar")}</Link></Button>}
            <Button asChild><Link href={`${base}/${test.id}/edit`}><Pencil /> {t("Tahrirlash")}</Link></Button>
            {isAdmin && (
              <ConfirmAction
                trigger={<Button variant="outline" className="text-error"><Trash2 /> {t("O'chirish")}</Button>}
                title={t("Testni o'chirish")}
                description={
                  totalAttempts
                    ? t("Test va uni topshirgan {n} ta talabaning natijalari butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.", { n: totalAttempts })
                    : t("Test butunlay o'chiriladi. Savollar bankdagi savollar saqlanib qoladi.")
                }
                confirmLabel={t("O'chirish")}
                action={deleteTestAction.bind(null, test.id)}
              />
            )}
          </>
        }
      />
      {saved && <Alert variant="success" className="mb-4"><span>{t("Test saqlandi.")}</span></Alert>}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>{t("Savollar")}</CardTitle>
            {!locked && (
              <div className="flex flex-wrap gap-2">
                <WordImportDialog testId={test.id} />
                <ImportDialog
                  kind="questions"
                  testId={test.id}
                  trigger={<Button size="sm" variant="outline"><Upload /> {t("Excel'dan yuklash")}</Button>}
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {locked && (
              <Alert variant="info" className="mb-3">
                <Lock />
                <span>{t("Talabalar testni boshlagan. Natijalar adolatli bo'lishi uchun savollar tarkibi qulflangan.")}</span>
              </Alert>
            )}
            <TestQuestions
              testId={test.id}
              locked={locked}
              items={test.questions.map((tq) => ({
                id: tq.question.id,
                text: tq.question.text,
                subject: tq.question.subject,
                typeLabel: t(QUESTION_TYPE_LABEL[tq.question.type]),
                points: tq.points,
              }))}
              bank={bank.map((q) => ({ id: q.id, text: q.text, subject: q.subject, typeLabel: t(QUESTION_TYPE_LABEL[q.type]) }))}
            />
          </CardContent>
        </Card>
        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t("Ma'lumotlar")}</CardTitle>
              <Badge variant={st.variant}>{t(st.label)}</Badge>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
                <span className="text-sm font-semibold text-midnight">{test.isPublished ? (olympiad ? t("Faol: ishtirokchilarga ko'rinadi") : t("Faol: talabalarga ko'rinadi")) : olympiad ? t("Nofaol: ishtirokchilarga ko'rinmaydi") : t("Nofaol: talabalarga ko'rinmaydi")}</span>
                <ActiveSwitch id={test.id} active={test.isPublished} />
              </div>
              {testState(test, now) === "open" && (
                <div className="mb-4">
                  <EndTestButton testId={test.id} />
                </div>
              )}
              <dl className="grid gap-2.5 text-sm">
                {[
                  [t("Boshlanish"), formatDateTime(test.startsAt, lang)],
                  [t("Tugash"), formatDateTime(test.endsAt, lang)],
                  [t("Davomiylik"), formatDuration(test.durationMinutes, lang)],
                  ...(olympiad ? [] : [[t("O'tish chegarasi"), `${test.passingPercent}%`]]),
                  [
                    t("Savollar (har bir talabaga)"),
                    test.questionsPerAttempt && test.questionsPerAttempt < test.questions.length
                      ? t("{n} ta / {total} tadan", { n: test.questionsPerAttempt, total: test.questions.length })
                      : t("Hammasi ({total} ta)", { total: test.questions.length }),
                  ],
                  [t("Jami baho"), t("{n} ball", { n: test.maxScore ?? rawMax })],
                  [t("Urinishlar soni"), test.maxAttempts > 1 ? t("{n} marta", { n: test.maxAttempts }) : t("1 marta")],
                  [t("Natija"), t(RESULT_RELEASE_LABEL[test.resultRelease])],
                  ...(olympiad ? [] : [[t("Universitetlar"), test.universities.map((u) => u.name).join(", ") || "—"]]),
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
          <TestScheduleCard
            testId={test.id}
            startsAt={toLocalInput(test.startsAt)}
            endsAt={toLocalInput(test.endsAt)}
            durationMinutes={test.durationMinutes}
            maxScore={test.maxScore}
            rawMax={rawMax}
            questionsPerAttempt={test.questionsPerAttempt}
            maxAttempts={test.maxAttempts}
            totalQuestions={test.questions.length}
            locked={locked}
          />
          {!olympiad && <TestAccessCard
            testId={test.id}
            restricted={test.restrictedAccess}
            allowedCount={test._count.access}
            universities={test.universities.map((u) => ({ id: u.id, name: u.name }))}
            faculties={faculties}
            groups={groups}
          />}
          <Card>
            <CardHeader><CardTitle>{t("Statistika")}</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{stats._count}</p><p className="text-xs text-muted-foreground">{t("Topshirilgan")}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{inProgress}</p><p className="text-xs text-muted-foreground">{t("Jarayonda")}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{stats._avg.percent === null ? "—" : `${stats._avg.percent.toFixed(1)}%`}</p><p className="text-xs text-muted-foreground">{t("O'rtacha")}</p></div>
                <div className="rounded-lg bg-muted p-3"><p className="text-xl font-extrabold text-midnight">{stats._max.percent === null ? "—" : `${stats._min.percent}–${stats._max.percent}%`}</p><p className="text-xs text-muted-foreground">{t("Oraliq")}</p></div>
              </div>
              <p className="text-muted-foreground">
                {t("Talabalar uchun natija holati:")} <b className="text-midnight">{released ? t("e'lon qilingan") : t("e'lon qilinmagan")}</b>
              </p>
              {isAdmin && test.resultRelease === "MANUAL" &&
                (test.resultsReleasedAt ? (
                  <ConfirmAction
                    trigger={<Button variant="outline"><Undo2 /> {t("E'lonni bekor qilish")}</Button>}
                    title={t("Natijalarni yashirish")}
                    description={t("Talabalar natija va to'g'ri javoblarni ko'ra olmaydi.")}
                    confirmLabel={t("Yashirish")}
                    action={setResultsReleasedAction.bind(null, test.id, false)}
                  />
                ) : (
                  <ConfirmAction
                    trigger={<Button variant="success"><Megaphone /> {t("Natijalarni e'lon qilish")}</Button>}
                    title={t("Natijalarni e'lon qilish")}
                    description={t("Talabalar o'z ballari va to'g'ri javoblarni ko'ra oladi. Agar test hali davom etayotgan bo'lsa, javoblar boshqalarga tarqalishi mumkin.")}
                    confirmLabel={t("E'lon qilish")}
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
