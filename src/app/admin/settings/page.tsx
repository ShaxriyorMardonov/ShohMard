import type { Metadata } from "next";
import { AdminProfileForm } from "@/components/admin/admin-profile-form";
import { BRAND, SamuLogo } from "@/components/brand/samu-logo";
import { PageHeader } from "@/components/layout/app-shell";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Sozlamalar" };

export default async function SettingsPage() {
  const admin = await requireStaff();
  return (
    <>
      <PageHeader title="Sozlamalar" description="Hisob va platforma ma'lumotlari" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>Login: <span className="font-mono">{admin.login}</span></CardDescription>
          </CardHeader>
          <CardContent><AdminProfileForm fullName={admin.fullName} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Parolni o&apos;zgartirish</CardTitle></CardHeader>
          <CardContent><ChangePasswordForm /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Platforma</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="rounded-xl bg-midnight p-5"><SamuLogo tone="dark" withFullName /></div>
            <div className="rounded-xl border p-5"><SamuLogo withFullName /></div>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-midnight">{BRAND.fullName}</p>
              <p>{BRAND.slogan}</p>
              <p className="mt-2">Vaqt mintaqasi: Asia/Tashkent (UTC+05:00)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
