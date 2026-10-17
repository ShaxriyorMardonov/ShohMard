import { PageHeader } from "@/components/layout/app-shell";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { requireExaminee } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Profil") };
}

export default async function ParticipantProfilePage() {
  const user = await requireExaminee();
  const { t } = await getT();
  const me = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true, organization: true } });
  const rows = [
    [t("F.I.Sh."), user.fullName],
    [t("Login"), user.login],
    [t("Telefon"), me.phone ?? "—"],
    [t("O'quv muassasasi"), user.university?.name ?? me.organization ?? "—"],
  ];
  return (
    <>
      <PageHeader title={t("Profil")} description={t("Shaxsiy ma'lumotlaringiz va xavfsizlik sozlamalari")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("Shaxsiy ma'lumotlar")}</CardTitle></CardHeader>
          <CardContent>
            <dl className="divide-y divide-border">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-semibold text-midnight">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("Parolni o'zgartirish")}</CardTitle></CardHeader>
          <CardContent><ChangePasswordForm /></CardContent>
        </Card>
      </div>
    </>
  );
}
