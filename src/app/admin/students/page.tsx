import type { Metadata } from "next";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { deleteStudentAction } from "@/actions/admin";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { StudentDialog } from "@/components/admin/student-dialog";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Talabalar" };
const PER_PAGE = 25;

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; university?: string; page?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = parsePage(sp.page);
  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
    ...(sp.university ? { universityId: sp.university } : {}),
    ...(q
      ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { login: { contains: q, mode: "insensitive" } }, { groupName: { contains: q, mode: "insensitive" } }] }
      : {}),
  };
  const [universities, total, students] = await Promise.all([
    prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        fullName: true,
        login: true,
        groupName: true,
        isActive: true,
        universityId: true,
        lastLoginAt: true,
        university: { select: { shortName: true } },
        _count: { select: { attempts: true } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Talabalar"
        description="Talaba hisoblari faqat administrator tomonidan yaratiladi"
        actions={<StudentDialog universities={universities} trigger={<Button disabled={!universities.length}><Plus /> Talaba qo&apos;shish</Button>} />}
      />
      <form className="mb-4 grid gap-3 sm:grid-cols-[1fr_260px_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder="Ism, login yoki guruh bo'yicha qidirish" className="pl-9" aria-label="Qidirish" />
        </div>
        <NativeSelect name="university" defaultValue={sp.university ?? ""} aria-label="Universitet">
          <option value="">Barcha universitetlar</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="midnight">Filtrlash</Button>
      </form>
      {students.length === 0 ? (
        <EmptyState icon={<Users />} title="Talabalar topilmadi" description={universities.length ? "Filtrni o'zgartiring yoki yangi talaba qo'shing." : "Avval universitet qo'shing."} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>F.I.Sh.</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Universitet</TableHead>
                <TableHead>Guruh</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Oxirgi kirish</TableHead>
                <TableHead className="text-right">Amallar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold text-midnight">{s.fullName}</TableCell>
                  <TableCell className="font-mono text-xs">{s.login}</TableCell>
                  <TableCell>{s.university?.shortName ?? "—"}</TableCell>
                  <TableCell>{s.groupName ?? "—"}</TableCell>
                  <TableCell>{s.isActive ? <Badge variant="success">Faol</Badge> : <Badge variant="muted">Nofaol</Badge>}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(s.lastLoginAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <StudentDialog
                        student={s}
                        universities={universities}
                        trigger={<Button size="icon-sm" variant="ghost" aria-label="Tahrirlash"><Pencil /></Button>}
                      />
                      <ConfirmAction
                        trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label="O'chirish"><Trash2 /></Button>}
                        title="Talabani o'chirish"
                        description={
                          s._count.attempts
                            ? `${s.fullName} imtihon topshirgan. Natijalarni saqlash uchun hisobni nofaol qilish tavsiya etiladi.`
                            : `${s.fullName} hisobi butunlay o'chiriladi.`
                        }
                        confirmLabel="O'chirish"
                        action={deleteStudentAction.bind(null, s.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={{ q, university: sp.university }} />
        </Card>
      )}
    </>
  );
}
