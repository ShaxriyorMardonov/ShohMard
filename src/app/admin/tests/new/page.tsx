import { TestForm } from "@/components/admin/test-form";
import { PageHeader } from "@/components/layout/app-shell";
import { getT } from "@/i18n/server";
import { notFound } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { OLYMPIAD, parseOlympiadSlug } from "@/lib/olympiad";
import { prisma } from "@/lib/db";
import { testSubjects } from "@/server/org";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Yangi test") };
}

export default async function NewTestPage({ params }: { params: Promise<{ kind?: string }> }) {
  const { kind: slugRaw } = await params;
  const slug = parseOlympiadSlug(slugRaw);
  if (slugRaw && !slug) notFound();
  const staff = slug ? { ...(await requireAdmin()), scope: null } : await requireStaff();
  const { t } = await getT();
  if (slug) {
    const o = OLYMPIAD[slug];
    return (
      <div className="max-w-3xl">
        <PageHeader title={t("Yangi olimpiada")} description={t(o.title)} />
        <TestForm universities={[]} subjects={await testSubjects(null)} kind={o.kind} basePath={`/admin/olympiads/${slug}`} />
      </div>
    );
  }
  const subjects = await testSubjects(staff.scope);
  const universities = await prisma.university.findMany({ where: staff.scope ? { id: staff.scope } : {}, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("Yangi test")} description={t("Test yaratilgach, unga savollar bankidan savollar qo'shasiz")} />
      <TestForm universities={universities} subjects={subjects} fixedUniversity={staff.scope ? staff.university?.name : undefined} />
    </div>
  );
}
