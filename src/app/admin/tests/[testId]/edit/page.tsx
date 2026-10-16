import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestForm } from "@/components/admin/test-form";
import { PageHeader } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toLocalInput } from "@/lib/time";

export const metadata: Metadata = { title: "Testni tahrirlash" };

export default async function EditTestPage({ params }: { params: Promise<{ testId: string }> }) {
  await requireAdmin();
  const { testId } = await params;
  const [test, universities] = await Promise.all([
    prisma.test.findUnique({
      where: { id: testId },
      include: { universities: { select: { id: true } }, _count: { select: { questions: true } } },
    }),
    prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!test) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Testni tahrirlash" description={test.title} />
      <TestForm
        universities={universities}
        initial={{
          id: test.id,
          title: test.title,
          description: test.description,
          subject: test.subject,
          durationMinutes: test.durationMinutes,
          startsAt: toLocalInput(test.startsAt),
          endsAt: toLocalInput(test.endsAt),
          passingPercent: test.passingPercent,
          resultRelease: test.resultRelease,
          isPublished: test.isPublished,
          universityIds: test.universities.map((u) => u.id),
          questionCount: test._count.questions,
        }}
      />
    </div>
  );
}
