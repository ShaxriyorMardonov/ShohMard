import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUniversityAction } from "@/actions/admin";
import { ImportDialog } from "@/components/admin/import-dialog";
import { UniversityDialog } from "@/components/admin/university-dialog";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Universitetlar" };
export const maxDuration = 60;

export default async function UniversitiesPage() {
  await requireAdmin();
  const universities = await prisma.university.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true, tests: true } } },
  });

  return (
    <>
      <PageHeader
        title="Universitetlar"
        description="Platformaga ulangan oliy ta'lim muassasalari"
        actions={
          <>
            <ImportDialog kind="universities" />
            <UniversityDialog trigger={<Button><Plus /> Universitet qo&apos;shish</Button>} />
          </>
        }
      />
      {universities.length === 0 ? (
        <EmptyState icon={<Building2 />} title="Universitetlar yo'q" description="Birinchi universitetni qo'shing." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomi</TableHead>
                <TableHead>Qisqa nomi</TableHead>
                <TableHead>Shahar</TableHead>
                <TableHead>Talabalar</TableHead>
                <TableHead>Testlar</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {universities.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold text-midnight">{u.name}</TableCell>
                  <TableCell>{u.shortName}</TableCell>
                  <TableCell className="text-muted-foreground">{u.city ?? "—"}</TableCell>
                  <TableCell>
                    <Link href={`/admin/students?university=${u.id}`} className="font-semibold text-royal hover:underline">{u._count.students}</Link>
                  </TableCell>
                  <TableCell>{u._count.tests}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <UniversityDialog
                        university={u}
                        trigger={<Button size="icon-sm" variant="ghost" aria-label="Tahrirlash"><Pencil /></Button>}
                      />
                      <ConfirmAction
                        trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label="O'chirish"><Trash2 /></Button>}
                        title="Universitetni o'chirish"
                        description={
                          u._count.students
                            ? `"${u.name}" o'chiriladi. Undagi ${u._count.students} ta talaba va ularning natijalari saqlanadi, lekin ularni boshqa universitetga biriktirmaguningizcha tizimga kira olmaydi.`
                            : `"${u.name}" o'chiriladi.`
                        }
                        confirmLabel="O'chirish"
                        action={deleteUniversityAction.bind(null, u.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
