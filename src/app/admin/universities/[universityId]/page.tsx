import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteFacultyAction, deleteGroupAction } from "@/actions/admin";
import { OrgDialog } from "@/components/admin/org-dialog";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Fakultet va guruhlar") };
}

type GroupItem = { id: string; name: string; facultyId: string | null; _count: { students: number } };

export default async function UniversityDetailPage({ params }: { params: Promise<{ universityId: string }> }) {
  await requireAdmin();
  const { t } = await getT();
  const { universityId } = await params;
  const uni = await prisma.university.findUnique({
    where: { id: universityId },
    include: {
      faculties: { orderBy: { name: "asc" }, include: { _count: { select: { students: true } } } },
      groups: { orderBy: { name: "asc" }, include: { _count: { select: { students: true } } } },
      _count: { select: { students: true } },
    },
  });
  if (!uni) notFound();
  const faculties = uni.faculties.map((f) => ({ id: f.id, name: f.name }));
  const loose = uni.groups.filter((g) => !g.facultyId);

  const groupChips = (groups: GroupItem[]) =>
    groups.length === 0 ? (
      <p className="text-sm text-muted-foreground">{t("Guruhlar yo'q")}</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <div key={g.id} className="flex items-center gap-1 rounded-lg border bg-card py-1 pl-3 pr-1 text-sm">
            <Link href={`/admin/students?university=${uni.id}&group=${g.id}`} className="font-semibold text-midnight hover:text-royal">{g.name}</Link>
            <Badge variant="muted" className="ml-1">{g._count.students}</Badge>
            <OrgDialog
              kind="group"
              universityId={uni.id}
              item={g}
              faculties={faculties}
              trigger={<Button size="icon-sm" variant="ghost" aria-label={t("{name} guruhini tahrirlash", { name: g.name })}><Pencil /></Button>}
            />
            <ConfirmAction
              trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label={t("{name} guruhini o'chirish", { name: g.name })}><Trash2 /></Button>}
              title={t("Guruhni o'chirish")}
              description={t("\"{name}\" guruhi o'chiriladi. Undagi {n} ta talaba saqlanadi, faqat guruhsiz qoladi.", { name: g.name, n: g._count.students })}
              confirmLabel={t("O'chirish")}
              action={deleteGroupAction.bind(null, g.id)}
            />
          </div>
        ))}
      </div>
    );

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/admin/universities"><ArrowLeft /> {t("Universitetlar")}</Link>
      </Button>
      <PageHeader
        title={uni.name}
        description={t("{f} ta fakultet · {g} ta guruh · {s} ta talaba", { f: uni.faculties.length, g: uni.groups.length, s: uni._count.students })}
        actions={
          <>
            <OrgDialog kind="group" universityId={uni.id} faculties={faculties} trigger={<Button variant="outline"><Plus /> {t("Guruh qo'shish")}</Button>} />
            <OrgDialog kind="faculty" universityId={uni.id} trigger={<Button><Plus /> {t("Fakultet qo'shish")}</Button>} />
          </>
        }
      />
      {uni.faculties.length === 0 && uni.groups.length === 0 ? (
        <EmptyState
          icon={<GraduationCap />}
          title={t("Fakultetlar yo'q")}
          description={t("Fakultet va guruhlarni shu yerda qo'shing yoki talabalarni Excel'dan yuklang: fakultet va guruhlar avtomatik yaratiladi.")}
        />
      ) : (
        <div className="grid gap-4">
          {uni.faculties.map((f) => (
            <Card key={f.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-base">
                  {f.name}
                  <span className="ml-2 text-xs font-medium text-muted-foreground">{t("{n} ta talaba", { n: f._count.students })}</span>
                </CardTitle>
                <div className="flex gap-1">
                  <OrgDialog
                    kind="group"
                    universityId={uni.id}
                    faculties={faculties}
                    defaultFacultyId={f.id}
                    trigger={<Button size="sm" variant="outline"><Plus /> {t("Guruh")}</Button>}
                  />
                  <OrgDialog kind="faculty" universityId={uni.id} item={f} trigger={<Button size="icon-sm" variant="ghost" aria-label={t("Fakultetni tahrirlash")}><Pencil /></Button>} />
                  <ConfirmAction
                    trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label={t("Fakultetni o'chirish")}><Trash2 /></Button>}
                    title={t("Fakultetni o'chirish")}
                    description={t("\"{name}\" o'chiriladi. Uning guruhlari va talabalari saqlanadi, faqat fakultetsiz qoladi.", { name: f.name })}
                    confirmLabel={t("O'chirish")}
                    action={deleteFacultyAction.bind(null, f.id)}
                  />
                </div>
              </CardHeader>
              <CardContent>{groupChips(uni.groups.filter((g) => g.facultyId === f.id))}</CardContent>
            </Card>
          ))}
          {loose.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t("Fakultetga biriktirilmagan guruhlar")}</CardTitle></CardHeader>
              <CardContent>{groupChips(loose)}</CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
