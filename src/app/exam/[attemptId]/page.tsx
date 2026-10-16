import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireStudent } from "@/lib/auth";
import { SAVE_GRACE_MS, isExpired } from "@/lib/exam-rules";
import { finalizeAttempt, getExamView } from "@/server/exam";
import { ExamClient } from "./exam-client";

export const metadata: Metadata = { title: "Imtihon" };
export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireStudent();
  const view = await getExamView(user.id, attemptId);
  if (!view) notFound();

  if (view.status === "IN_PROGRESS" && isExpired(view.deadlineAt, new Date(), SAVE_GRACE_MS)) {
    await finalizeAttempt(view.id, { auto: true });
    redirect(`/student/results/${view.id}`);
  }
  if (view.status !== "IN_PROGRESS") redirect(`/student/results/${view.id}`);

  return (
    <ExamClient
      attemptId={view.id}
      title={view.test.title}
      subject={view.test.subject}
      deadlineAt={view.deadlineAt.toISOString()}
      serverNow={new Date().toISOString()}
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
