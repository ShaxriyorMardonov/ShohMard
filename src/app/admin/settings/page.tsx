import { AdminProfileForm } from "@/components/admin/admin-profile-form";
import { BRAND, SamuLogo } from "@/components/brand/samu-logo";
import { PageHeader } from "@/components/layout/app-shell";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { SessionsList, type SessionRow } from "@/components/admin/security-card";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Sozlamalar") };
}

function describeDevice(ua: string | null): { device: string; mobile: boolean } {
  const u = ua ?? "";
  const os = /iPhone|iPad/.test(u) ? "iOS" : /Android/.test(u) ? "Android" : /Windows/.test(u) ? "Windows" : /Mac OS X/.test(u) ? "macOS" : /Linux/.test(u) ? "Linux" : "";
  const br = /Edg\//.test(u) ? "Edge" : /OPR\//.test(u) ? "Opera" : /YaBrowser/.test(u) ? "Yandex" : /Firefox\//.test(u) ? "Firefox" : /Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "";
  return { device: [br, os].filter(Boolean).join(" · ") || "—", mobile: /Mobile|Android|iPhone/.test(u) };
}

export default async function SettingsPage() {
  const admin = await requireStaff();
  const { t, lang } = await getT();
  const [sessions] = await Promise.all([
    prisma.session.findMany({
      where: {
        userId: admin.id,
        mfaPending: false,
        expiresAt: { gt: new Date() },
        // Super admin sessiyasi 2 soat harakatsizlikdan keyin tugaydi
        ...(admin.roles.includes("ADMIN") ? { lastSeenAt: { gt: new Date(Date.now() - 2 * 60 * 60 * 1000) } } : {}),
      },
      orderBy: { lastSeenAt: "desc" },
      take: 20,
      select: { id: true, ip: true, userAgent: true, lastSeenAt: true },
    }),
  ]);
  const sessionRows: SessionRow[] = sessions.map((s) => ({
    id: s.id,
    current: s.id === admin.sessionId,
    ip: s.ip,
    ...describeDevice(s.userAgent),
    lastSeen: formatDateTime(s.lastSeenAt, lang),
  }));
  return (
    <>
      <PageHeader title={t("Sozlamalar")} description={t("Hisob va platforma ma'lumotlari")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Profil")}</CardTitle>
            <CardDescription>{t("Login")}: <span className="font-mono">{admin.login}</span></CardDescription>
          </CardHeader>
          <CardContent><AdminProfileForm fullName={admin.fullName} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("Parolni o'zgartirish")}</CardTitle></CardHeader>
          <CardContent><ChangePasswordForm /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("Faol sessiyalar")}</CardTitle>
            <CardDescription>{t("Hisobingiz ochiq turgan qurilmalar. Tanimagan qurilma bo'lsa, undan chiqing va parolni almashtiring.")}</CardDescription>
          </CardHeader>
          <CardContent><SessionsList sessions={sessionRows} /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("Platforma")}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-6">
            <div className="rounded-xl bg-midnight p-5"><SamuLogo tone="dark" withFullName /></div>
            <div className="rounded-xl border p-5"><SamuLogo withFullName /></div>
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold text-midnight">{BRAND.fullName}</p>
              <p>{t(BRAND.slogan)}</p>
              <p className="mt-2">{t("Vaqt mintaqasi: {tz}", { tz: "Asia/Tashkent (UTC+05:00)" })}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
