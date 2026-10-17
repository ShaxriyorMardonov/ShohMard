import Link from "next/link";
import { UniversityActiveSwitch } from "@/components/admin/user-active-switch";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUniversityAction } from "@/actions/admin";
import { ImportDialog } from "@/components/admin/import-dialog";
import { UniversityDialog } from "@/components/admin/university-dialog";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Universitetlar") };
}
export const maxDuration = 60;

export default async function UniversitiesPage() {
  await requireAdmin();
  const { t } = await getT();
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true, tests: true, faculties: true, groups: true } } },
  });

  return (
    <>
      <PageHeader
        title={t("Universitetlar")}
        description={t("Fakultet va guruhlarni boshqarish uchun universitet nomini bosing")}
        actions={
          <>
            <ImportDialog kind="universities" />
            <UniversityDialog trigger={<Button><Plus /> {t("Universitet qo'shish")}</Button>} />
          </>
        }
      />
      {universities.length === 0 ? (
        <EmptyState icon={<Building2 />} title={t("Universitetlar yo'q")} description={t("Birinchi universitetni qo'shing.")} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Nomi")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Qisqa nomi")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Shahar")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Fakultet / guruh")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Talabalar")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Testlar")}</TableHead>
                <TableHead className="text-right">{t("Amallar")}</TableHead>
                <TableHead className="w-20">{t("Faol")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {universities.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link href={`/admin/universities/${u.id}`} className="font-semibold text-midnight hover:text-royal">{u.name}</Link>
                    <span className="block text-xs text-muted-foreground md:hidden">
                      {[u.shortName, u.city].filter(Boolean).join(" · ")} · {t("{n} talaba", { n: u._count.students })} · {t("Testlar")}: {u._count.tests}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{u.shortName}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{u.city ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link href={`/admin/universities/${u.id}`} className="text-royal hover:underline">{u._count.faculties} / {u._count.groups}</Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Link href={`/admin/students?university=${u.id}`} className="font-semibold text-royal hover:underline">{u._count.students}</Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{u._count.tests}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <UniversityDialog
                        university={u}
                        trigger={<Button size="icon-sm" variant="ghost" aria-label={t("Tahrirlash")}><Pencil /></Button>}
                      />
                      <ConfirmAction
                        trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label={t("O'chirish")}><Trash2 /></Button>}
                        title={t("Universitetni o'chirish")}
                        description={
                          u._count.students
                            ? t("\"{name}\" o'chiriladi. Undagi {n} ta talaba va ularning natijalari saqlanadi, lekin ularni boshqa universitetga biriktirmaguningizcha tizimga kira olmaydi.", { name: u.name, n: u._count.students })
                            : t("\"{name}\" o'chiriladi.", { name: u.name })
                        }
                        confirmLabel={t("O'chirish")}
                        action={deleteUniversityAction.bind(null, u.id)}
                      />
                    </div>
                  </TableCell>
                  <TableCell><UniversityActiveSwitch id={u.id} active={u.isActive} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
