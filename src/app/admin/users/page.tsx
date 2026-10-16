import type { Metadata } from "next";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { deleteStaffUserAction } from "@/actions/admin";
import { StaffDialog } from "@/components/admin/staff-dialog";
import { PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin, sortRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Rollar" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const [users, universities] = await Promise.all([
    prisma.user.findMany({
      where: { roles: { hasSome: ["ADMIN", "MANAGER"] } },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, login: true, role: true, roles: true, universityId: true, isActive: true, lastLoginAt: true, university: { select: { shortName: true } } },
    }),
    prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Rollar"
        description="Administratorlar va universitet menejerlari"
        actions={<StaffDialog universities={universities} trigger={<Button><Plus /> Foydalanuvchi qo&apos;shish</Button>} />}
      />
      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-5 text-sm sm:grid-cols-2">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-royal" />
            <p><b className="text-midnight">Administrator</b>: universitetlar, fakultetlar, talabalar, testlar, savollar banki, natijalar va rollar.</p>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <p><b className="text-midnight">Universitet menejeri</b>: faqat o&apos;z universiteti uchun talaba yuklash, test yaratish va test vaqtini ochish. Bitta foydalanuvchiga bir nechta rol berish mumkin.</p>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>F.I.Sh.</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Rollar</TableHead>
              <TableHead>Universitet</TableHead>
              <TableHead>Holat</TableHead>
              <TableHead>Oxirgi kirish</TableHead>
              <TableHead className="text-right">Amallar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const self = u.id === me.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold text-midnight">{u.fullName}{self && <span className="ml-1 text-xs font-normal text-muted-foreground">(siz)</span>}</TableCell>
                  <TableCell className="font-mono text-xs">{u.login}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sortRoles(u.roles).map((r) => (
                        <Badge key={r} variant={r === "ADMIN" ? "default" : r === "MANAGER" ? "success" : "muted"}>{ROLE_LABEL[r]}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{u.university?.shortName ?? "—"}</TableCell>
                  <TableCell>{u.isActive ? <Badge variant="success">Faol</Badge> : <Badge variant="muted">Nofaol</Badge>}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(u.lastLoginAt)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <StaffDialog
                        user={{ ...u, roles: sortRoles(u.roles) }}
                        universities={universities}
                        isSelf={self}
                        trigger={<Button size="icon-sm" variant="ghost" aria-label="Tahrirlash"><Pencil /></Button>}
                      />
                      {!self && (
                        <ConfirmAction
                          trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label="O'chirish"><Trash2 /></Button>}
                          title="Foydalanuvchini o'chirish"
                          description={u.roles.includes("STUDENT") ? `${u.fullName}: xodim rollari olib tashlanadi, talaba natijalari bo'lsa hisob talaba sifatida saqlanadi.` : `${u.fullName} hisobi o'chiriladi. U yaratgan testlar saqlanadi.`}
                          confirmLabel="O'chirish"
                          action={deleteStaffUserAction.bind(null, u.id)}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
