import { QuestionForm } from "@/components/admin/question-form";
import { PageHeader } from "@/components/layout/app-shell";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Yangi savol") };
}

export default async function NewQuestionPage() {
  await requireAdmin();
  const { t } = await getT();
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("Yangi savol")} description={t("Savol savollar bankiga qo'shiladi va istalgan testga biriktirilishi mumkin")} />
      <QuestionForm />
    </div>
  );
}
