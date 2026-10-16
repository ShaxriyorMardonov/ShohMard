import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/app-shell";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireStudent();
  const rows = [
    ["F.I.Sh.", user.fullName],
    ["Login", user.login],
    ["Universitet", user.university.name],
    ["Guruh", user.groupName ?? "—"],
  ];
  return (
    <>
      <PageHeader title="Profil" description="Shaxsiy ma'lumotlaringiz va xavfsizlik sozlamalari" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Shaxsiy ma&apos;lumotlar</CardTitle>
            <CardDescription>Ma&apos;lumotlarni o&apos;zgartirish uchun administratorga murojaat qiling.</CardDescription>
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
            <CardTitle>Parolni o&apos;zgartirish</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
