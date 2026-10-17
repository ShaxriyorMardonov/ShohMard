import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { SamuLogo } from "@/components/brand/samu-logo";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getPendingMfa, homeFor } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTotpSecret, otpauthUrl } from "@/lib/totp";
import { MfaSetupForm, MfaVerifyForm } from "./mfa-forms";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Ikki bosqichli tasdiqlash") };
}

/** Super admin: paroldan keyin autentifikator ilovasidagi kod (birinchi marta — ilovani ulash). */
export default async function MfaPage() {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  const { t } = await getT();
  const { user } = pending;
  const next = user.mustChangePassword ? "/change-password" : homeFor(user.role);

  let setup: { qr: string; secret: string } | null = null;
  if (!user.totpEnabledAt) {
    let secret = user.totpSecret;
    if (!secret) {
      secret = generateTotpSecret();
      await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } });
    }
    const qr = await QRCode.toString(otpauthUrl(secret, user.login), { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    setup = { qr, secret: secret.replace(/(.{4})/g, "$1 ").trim() };
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <SamuLogo size="md" />
          <LangSwitcher compact className="w-40" />
        </div>
        <Card>
          <CardContent className="grid gap-5 pt-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-royal/10 text-royal"><ShieldCheck className="size-5" /></span>
              <div>
                <h1 className="text-lg font-bold text-midnight">{t("Ikki bosqichli tasdiqlash")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {setup
                    ? t("Super admin hisobini himoyalash uchun telefoningizga autentifikator ilovasini ulang (Google Authenticator, Microsoft Authenticator yoki boshqa).")
                    : t("Telefoningizdagi autentifikator ilovasida ko'rsatilgan 6 xonali kodni kiriting.")}
                </p>
              </div>
            </div>
            {setup ? (
              <MfaSetupForm qrSvg={setup.qr} secret={setup.secret} next={next} />
            ) : (
              <MfaVerifyForm />
            )}
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground"><LogOut /> {t("Bekor qilish va chiqish")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
