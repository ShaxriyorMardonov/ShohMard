import { PageHeader } from "@/components/layout/app-shell";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { requireStudent } from "@/lib/auth";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Profil") };
}

export default async function ProfilePage() {
  const user = await requireStudent();
  const { t } = await getT();
  const rows = [
    [t("F.I.Sh."), user.fullName],
    [t("Login"), user.login],
    [t("Universitet"), user.university.name],
    [t("Guruh"), user.groupName ?? "—"],
  ];
  return (
    <>
      <PageHeader title={t("Profil")} description={t("Shaxsiy ma'lumotlaringiz va xavfsizlik sozlamalari")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Shaxsiy ma'lumotlar")}</CardTitle>
            <CardDescription>{t("Ma'lumotlarni o'zgartirish uchun administratorga murojaat qiling.")}</CardDescription>
          </CardHeader>
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
          <CardHeader>
            <CardTitle>{t("Parolni o'zgartirish")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
