import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TestForm } from "@/components/admin/test-form";
import { PageHeader } from "@/components/layout/app-shell";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { testScopeWhere, testSubjects } from "@/server/org";
import { toLocalInput } from "@/lib/time";

export const metadata: Metadata = { title: "Testni tahrirlash" };

export default async function EditTestPage({ params }: { params: Promise<{ testId: string }> }) {
  const staff = await requireStaff();
  const { testId } = await params;
  const [test, universities] = await Promise.all([
    prisma.test.findFirst({
      where: { id: testId, ...testScopeWhere(staff.scope) },
      include: { universities: { select: { id: true } }, _count: { select: { questions: true } } },
    }),
    prisma.university.findMany({ where: staff.scope ? { id: staff.scope } : {}, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!test) notFound();
  const subjects = await testSubjects(staff.scope);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Testni tahrirlash" description={test.title} />
      <TestForm
        universities={universities}
        subjects={subjects}
        fixedUniversity={staff.scope ? staff.university?.name : undefined}
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
