import { notFound, redirect } from "next/navigation";
import { getT } from "@/i18n/server";
import { requireExaminee } from "@/lib/auth";
import { isOlympiad } from "@/lib/olympiad";
import { SAVE_GRACE_MS, isExpired } from "@/lib/exam-rules";
import { finalizeAttempt, getExamView, trackAttemptDevice } from "@/server/exam";
import { ExamClient } from "./exam-client";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Imtihon") };
}
export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireExaminee();
  const view = await getExamView(user.id, attemptId);
  if (!view) notFound();
  const resultHref = `${isOlympiad(view.test.kind) ? "/olympiad/results" : "/student/results"}/${view.id}`;

  if (view.status === "IN_PROGRESS" && isExpired(view.deadlineAt, new Date(), SAVE_GRACE_MS)) {
    await finalizeAttempt(view.id, { auto: true });
    redirect(resultHref);
  }
  if (view.status !== "IN_PROGRESS") redirect(resultHref);
  const otherDevice = await trackAttemptDevice(view.id, user.id, user.sessionId);

  return (
    <ExamClient
      attemptId={view.id}
      resultHref={resultHref}
      title={view.test.title}
      subject={view.test.subject}
      deadlineAt={view.deadlineAt.toISOString()}
      serverNow={new Date().toISOString()}
      otherDevice={otherDevice}
      questions={view.test.questions.map((q) => ({
        id: q.question.id,
        text: q.question.text,
        type: q.question.type,
        points: q.points,
        options: q.question.options,
      }))}
      initialAnswers={view.answers.map((a) => ({
        questionId: a.questionId,
        selectedOptionIds: a.selectedOptionIds,
        flagged: a.flagged,
      }))}
    />
  );
}
