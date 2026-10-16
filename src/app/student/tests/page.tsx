import type { Metadata } from "next";
import { BookOpenCheck } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { TestCard } from "@/components/student/test-card";
import { requireStudent } from "@/lib/auth";
import { getStudentTests } from "@/server/student";

export const metadata: Metadata = { title: "Mavjud testlar" };

export default async function StudentTestsPage() {
  const user = await requireStudent();
  const tests = await getStudentTests(user.id, user.university.id);
  const active = tests.filter((t) => t.status === "open" || t.status === "in_progress");
  const upcoming = tests.filter((t) => t.status === "upcoming");

  return (
    <>
      <PageHeader title="Mavjud testlar" description={`${user.university.name} talabalari uchun belgilangan testlar`} />
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Hozir ochiq</h2>
        {active.length === 0 ? (
          <EmptyState icon={<BookOpenCheck />} title="Hozir ochiq testlar yo'q" description="Test vaqti boshlanganda shu yerda paydo bo'ladi." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {active.map((t) => (
              <TestCard key={t.id} test={t} />
            ))}
          </div>
        )}
      </section>
      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Rejalashtirilgan</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((t) => (
              <TestCard key={t.id} test={t} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
