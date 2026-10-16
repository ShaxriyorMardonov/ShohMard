import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Clock, X } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUESTION_TYPE_LABEL, isResultReleased, releaseTime } from "@/lib/exam-rules";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { finalizeExpiredAttempts } from "@/server/exam";

export default async function ResultDetailPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireStudent();
  const { t, lang } = await getT();
  await finalizeExpiredAttempts({ userId: user.id });

  // Avval faqat egalik va e'lon holatini tekshiramiz; kalitlar faqat ruxsat bo'lsa yuklanadi.
  const meta = await prisma.attempt.findFirst({
    where: { id: attemptId, userId: user.id },
    select: { status: true, test: { select: { title: true, resultRelease: true, endsAt: true, resultsReleasedAt: true } } },
  });
  if (!meta) notFound();
  if (meta.status !== "SUBMITTED" || !isResultReleased(meta.test, new Date())) {
    const at = releaseTime(meta.test);
    return (
      <>
        <PageHeader title={meta.test.title} />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="size-10 text-royal" />
            <p className="font-bold text-midnight">{t("Natija hali e'lon qilinmagan")}</p>
            <p className="text-sm text-muted-foreground">
              {at ? t("Natijalar {date} dan keyin ko'rinadi.", { date: formatDateTime(at, lang) }) : t("Natijalar administrator tomonidan e'lon qilinadi.")}
            </p>
            <Button asChild variant="outline">
              <Link href="/student/history">{t("Tarixga qaytish")}</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const attempt = await prisma.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: {
      score: true,
      maxScore: true,
      percent: true,
      correctCount: true,
      totalQuestions: true,
      submittedAt: true,
      autoSubmitted: true,
      questionIds: true,
      test: {
        select: {
          title: true,
          passingPercent: true,
          questions: {
            orderBy: { position: "asc" },
            select: {
              points: true,
              question: {
                select: {
                  id: true,
                  text: true,
                  type: true,
                  explanation: true,
                  options: { orderBy: { position: "asc" }, select: { id: true, text: true, isCorrect: true } },
                },
              },
            },
          },
        },
      },
      answers: { select: { questionId: true, selectedOptionIds: true, isCorrect: true, pointsAwarded: true } },
    },
  });
  const answers = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const pass = (attempt.percent ?? 0) >= attempt.test.passingPercent;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/student/results">
          <ArrowLeft /> {t("Natijalarga qaytish")}
        </Link>
      </Button>
      <PageHeader
        title={attempt.test.title}
        description={`${t("Topshirilgan: {date}", { date: formatDateTime(attempt.submittedAt, lang) })}${attempt.autoSubmitted ? ` ${t("(vaqt tugagach avtomatik)")}` : ""}`}
      />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-6 pt-5">
          <div>
            <p className="text-4xl font-extrabold text-midnight">{attempt.percent}%</p>
            <p className="text-sm text-muted-foreground">
              {t("{score}/{max} ball", { score: attempt.score, max: attempt.maxScore })}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {t("To'g'ri javoblar:")} <b className="text-foreground">{attempt.correctCount}</b> / {attempt.totalQuestions}
            <br />
            {t("O'tish chegarasi: {p}%", { p: attempt.test.passingPercent })}
          </div>
          <Badge variant={pass ? "success" : "error"} className="ml-auto text-sm">
            {pass ? t("Muvaffaqiyatli") : t("O'tmadi")}
          </Badge>
        </CardContent>
      </Card>

      <ol className="grid gap-4">
        {attempt.test.questions.filter((tq) => !attempt.questionIds.length || attempt.questionIds.includes(tq.question.id)).map(({ question: q, points }, i) => {
          const ans = answers.get(q.id);
          const selected = new Set(ans?.selectedOptionIds ?? []);
          const correct = ans?.isCorrect ?? false;
          return (
            <li key={q.id}>
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-royal">{t("{n}-savol", { n: i + 1 })}</span>
                    <Badge variant="muted">{t(QUESTION_TYPE_LABEL[q.type])}</Badge>
                    <Badge variant={correct ? "success" : selected.size ? "error" : "muted"} className="ml-auto">
                      {correct ? t("+{points} ball", { points }) : selected.size ? t("Noto'g'ri") : t("Javob berilmagan")}
                    </Badge>
                  </div>
                  <p className="whitespace-pre-line font-semibold text-midnight">{q.text}</p>
                  <ul className="mt-4 grid gap-2">
                    {q.options.map((o) => {
                      const isSel = selected.has(o.id);
                      return (
                        <li
                          key={o.id}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm",
                            o.isCorrect ? "border-success/40 bg-success/8" : isSel ? "border-error/40 bg-error/6" : "border-border",
                          )}
                        >
                          <span className="flex size-5 items-center justify-center">
                            {o.isCorrect ? <Check className="size-4 text-success" /> : isSel ? <X className="size-4 text-error" /> : null}
                          </span>
                          <span className="flex-1">{o.text}</span>
                          {isSel && <span className="text-xs font-semibold text-muted-foreground">{t("Sizning javobingiz")}</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {q.explanation && (
                    <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                      <b className="text-foreground">{t("Izoh:")}</b> {q.explanation}
                    </p>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
