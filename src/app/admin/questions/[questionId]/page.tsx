import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/question-form";
import { PageHeader } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Savolni tahrirlash" };

export default async function EditQuestionPage({ params }: { params: Promise<{ questionId: string }> }) {
  await requireAdmin();
  const { questionId } = await params;
  const q = await prisma.question.findUnique({
    where: { id: questionId },
    include: { options: { orderBy: { position: "asc" } } },
  });
  if (!q) notFound();
  const [answers, startedTests] = await Promise.all([
    prisma.answer.count({ where: { questionId } }),
    prisma.testQuestion.count({ where: { questionId, test: { attempts: { some: {} } } } }),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Savolni tahrirlash" />
      <QuestionForm
        locked={answers > 0 || startedTests > 0}
        initial={{
          id: q.id,
          text: q.text,
          type: q.type,
          subject: q.subject,
          explanation: q.explanation,
          options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
        }}
      />
    </div>
  );
}
