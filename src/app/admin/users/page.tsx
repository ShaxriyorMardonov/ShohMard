import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { deleteStaffUserAction } from "@/actions/admin";
import { StaffDialog } from "@/components/admin/staff-dialog";
import { PageHeader } from "@/components/layout/app-shell";
import { UserActiveSwitch } from "@/components/admin/user-active-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT } from "@/i18n/server";
import { requireAdmin, sortRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Rollar") };
}

export default async function UsersPage() {
  const me = await requireAdmin();
  const { t, lang } = await getT();
  const [users, universities] = await Promise.all([
    prisma.user.findMany({
      where: { roles: { hasSome: ["ADMIN", "MANAGER"] } },
      orderBy: [{ role: "asc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, login: true, role: true, roles: true, universityId: true, isActive: true, lastLoginAt: true, totpEnabledAt: true, university: { select: { shortName: true } } },
    }),
    prisma.university.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title={t("Rollar")}
        description={t("Super adminlar va universitet menejerlari")}
        actions={<StaffDialog universities={universities} trigger={<Button><Plus /> {t("Foydalanuvchi qo'shish")}</Button>} />}
      />
      <Card className="mb-6">
        <CardContent className="grid gap-3 pt-5 text-sm sm:grid-cols-2">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-royal" />
            <p><b className="text-midnight">{t("Super admin")}</b>: {t("universitetlar, fakultetlar, talabalar, testlar, savollar banki, natijalar va rollar.")}</p>
          </div>
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
            <p><b className="text-midnight">{t("Universitet menejeri")}</b>: {t("faqat o'z universiteti uchun talaba yuklash, test yaratish va test vaqtini ochish. Bitta foydalanuvchiga bir nechta rol berish mumkin.")}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("F.I.Sh.")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("Login")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("Rollar")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("Universitet")}</TableHead>
              <TableHead>{t("Holat")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("Oxirgi kirish")}</TableHead>
              <TableHead className="text-right">{t("Amallar")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => {
              const self = u.id === me.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-semibold text-midnight">{u.fullName}{self && <span className="ml-1 text-xs font-normal text-muted-foreground">{t("(siz)")}</span>}
                    <span className="block font-mono text-xs font-normal text-muted-foreground md:hidden">{u.login}{u.university && ` · ${u.university.shortName}`}</span>
                    <span className="mt-1 flex flex-wrap gap-1 sm:hidden">
                      {sortRoles(u.roles).map((r) => (
                        <Badge key={r} variant={r === "ADMIN" ? "default" : r === "MANAGER" ? "success" : "muted"}>{t(ROLE_LABEL[r])}</Badge>
                      ))}
                    </span>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{u.login}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {sortRoles(u.roles).map((r) => (
                        <Badge key={r} variant={r === "ADMIN" ? "default" : r === "MANAGER" ? "success" : "muted"}>{t(ROLE_LABEL[r])}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{u.university?.shortName ?? "—"}</TableCell>
                  <TableCell><UserActiveSwitch id={u.id} active={u.isActive} disabled={self} /></TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">{formatDateTime(u.lastLoginAt, lang)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <StaffDialog
                        user={{ ...u, roles: sortRoles(u.roles) }}
                        universities={universities}
                        isSelf={self}
                        trigger={<Button size="icon-sm" variant="ghost" aria-label={t("Tahrirlash")}><Pencil /></Button>}
                      />
                      {!self && (
                        <ConfirmAction
                          trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label={t("O'chirish")}><Trash2 /></Button>}
                          title={t("Foydalanuvchini o'chirish")}
                          description={u.roles.includes("STUDENT") ? t("{name}: xodim rollari olib tashlanadi, talaba natijalari bo'lsa hisob talaba sifatida saqlanadi.", { name: u.fullName }) : t("{name} hisobi o'chiriladi. U yaratgan testlar saqlanadi.", { name: u.fullName })}
                          confirmLabel={t("O'chirish")}
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
