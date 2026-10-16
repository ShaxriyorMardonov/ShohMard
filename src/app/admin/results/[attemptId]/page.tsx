import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUESTION_TYPE_LABEL } from "@/lib/exam-rules";
import { formatDateTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export default async function AdminAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  await requireAdmin();
  const { attemptId } = await params;
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      user: { select: { fullName: true, login: true, group: { select: { name: true } }, university: { select: { name: true } } } },
      test: {
        include: {
          questions: {
            orderBy: { position: "asc" },
            include: { question: { include: { options: { orderBy: { position: "asc" } } } } },
          },
        },
      },
      answers: true,
    },
  });
  if (!a) notFound();
  const answers = new Map(a.answers.map((x) => [x.questionId, x]));

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/results"><ArrowLeft /> Natijalar</Link>
      </Button>
      <PageHeader title={a.user.fullName} description={`${a.user.university?.name ?? ""}${a.user.group ? ` · ${a.user.group.name}` : ""} · ${a.test.title}`} />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-6 pt-5 text-sm">
          {a.status === "SUBMITTED" ? (
            <div>
              <p className="text-3xl font-extrabold text-midnight">{a.percent}%</p>
              <p className="text-muted-foreground">{a.score}/{a.maxScore} ball · {a.correctCount}/{a.totalQuestions} to&apos;g&apos;ri</p>
            </div>
          ) : (
            <Badge variant="warning">Jarayonda</Badge>
          )}
          <div className="text-muted-foreground">
            Boshlangan: {formatDateTime(a.startedAt)}<br />
            Topshirilgan: {formatDateTime(a.submittedAt)} {a.autoSubmitted && "(avtomatik)"}
          </div>
        </CardContent>
      </Card>
      <ol className="grid gap-4">
        {a.test.questions.filter((tq) => !a.questionIds.length || a.questionIds.includes(tq.question.id)).map(({ question: q, points }, i) => {
          const ans = answers.get(q.id);
          const sel = new Set(ans?.selectedOptionIds ?? []);
          return (
            <li key={q.id}>
              <Card>
                <CardContent className="pt-5">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-royal">{i + 1}-savol</span>
                    <Badge variant="muted">{QUESTION_TYPE_LABEL[q.type]}</Badge>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {ans?.pointsAwarded ?? 0}/{points} ball
                    </span>
                  </div>
                  <p className="whitespace-pre-line font-semibold text-midnight">{q.text}</p>
                  <ul className="mt-3 grid gap-1.5">
                    {q.options.map((o) => (
                      <li key={o.id} className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-sm", o.isCorrect ? "border-success/40 bg-success/8" : sel.has(o.id) ? "border-error/40 bg-error/6" : "border-border")}>
                        {o.isCorrect ? <Check className="size-4 text-success" /> : sel.has(o.id) ? <X className="size-4 text-error" /> : <span className="size-4" />}
                        <span className="flex-1">{o.text}</span>
                        {sel.has(o.id) && <span className="text-xs font-semibold text-muted-foreground">Tanlangan</span>}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
