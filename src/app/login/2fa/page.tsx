import { redirect } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { SamuLogo } from "@/components/brand/samu-logo";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { EmailCodeVerifyForm, EmailSetupForm } from "@/components/forms/email-code-forms";
import { getPendingMfa } from "@/lib/auth";
import { maskEmail } from "@/server/email-code";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Ikki bosqichli tasdiqlash") };
}

/** Super admin: paroldan keyin Gmail'ga yuborilgan kod (birinchi marta — Gmail manzilini tasdiqlash). */
export default async function MfaPage() {
  const pending = await getPendingMfa();
  if (!pending) redirect("/login");
  const { t } = await getT();
  const { user } = pending;
  const verified = !!user.email && !!user.emailVerifiedAt;

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
                  {verified
                    ? t("Gmail pochtangizga 6 xonali kod yuborildi. Uni shu yerga kiriting.")
                    : t("Super admin hisobini himoyalash uchun Gmail manzilingizni kiriting. Unga kod yuboriladi, keyingi kirishlarda ham kod shu manzilga keladi.")}
                </p>
              </div>
            </div>
            {verified ? <EmailCodeVerifyForm sentTo={maskEmail(user.email!)} /> : <EmailSetupForm mode="login" />}
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground"><LogOut /> {t("Bekor qilish va chiqish")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
