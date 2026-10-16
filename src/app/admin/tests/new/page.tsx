import type { Metadata } from "next";
import { TestForm } from "@/components/admin/test-form";
import { PageHeader } from "@/components/layout/app-shell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Yangi test" };

export default async function NewTestPage() {
  await requireAdmin();
  const universities = await prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl">
      <PageHeader title="Yangi test" description="Test yaratilgach, unga savollar bankidan savollar qo'shasiz" />
      <TestForm universities={universities} />
    </div>
  );
}
