import type { Metadata } from "next";
import { QuestionForm } from "@/components/admin/question-form";
import { PageHeader } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Yangi savol" };

export default async function NewQuestionPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Yangi savol" description="Savol savollar bankiga qo'shiladi va istalgan testga biriktirilishi mumkin" />
      <QuestionForm />
    </div>
  );
}
