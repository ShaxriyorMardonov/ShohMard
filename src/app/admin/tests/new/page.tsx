import type { Metadata } from "next";
import { TestForm } from "@/components/admin/test-form";
import { PageHeader } from "@/components/layout/app-shell";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { testSubjects } from "@/server/org";

export const metadata: Metadata = { title: "Yangi test" };

export default async function NewTestPage() {
  const staff = await requireStaff();
  const subjects = await testSubjects(staff.scope);
  const universities = await prisma.university.findMany({ where: staff.scope ? { id: staff.scope } : {}, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Yangi test" description="Test yaratilgach, unga savollar bankidan savollar qo'shasiz" />
      <TestForm universities={universities} subjects={subjects} fixedUniversity={staff.scope ? staff.university?.name : undefined} />
    </div>
  );
}
