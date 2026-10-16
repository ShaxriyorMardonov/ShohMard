import { BookOpenCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { TestCard } from "@/components/student/test-card";
import { getT } from "@/i18n/server";
import { requireStudent } from "@/lib/auth";
import { getStudentTests } from "@/server/student";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Mavjud testlar") };
}

export default async function StudentTestsPage() {
  const user = await requireStudent();
  const { t } = await getT();
  const tests = await getStudentTests(user.id, user.university.id);
  const active = tests.filter((x) => x.status === "open" || x.status === "in_progress");
  const upcoming = tests.filter((x) => x.status === "upcoming");

  return (
    <>
      <PageHeader title={t("Mavjud testlar")} description={t("{university} talabalari uchun belgilangan testlar", { university: user.university.name })} />
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("Hozir ochiq")}</h2>
        {active.length === 0 ? (
          <EmptyState icon={<BookOpenCheck />} title={t("Hozir ochiq testlar yo'q")} description={t("Test vaqti boshlanganda shu yerda paydo bo'ladi.")} />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((x) => (
              <TestCard key={x.id} test={x} />
            ))}
          </div>
        )}
      </section>
      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">{t("Rejalashtirilgan")}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((x) => (
              <TestCard key={x.id} test={x} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
