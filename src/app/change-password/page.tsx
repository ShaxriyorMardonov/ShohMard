import { redirect } from "next/navigation";
import { KeyRound, LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import { SamuLogo } from "@/components/brand/samu-logo";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { getCurrentUser, homeFor } from "@/lib/auth";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Yangi parol qo'yish") };
}

/** Birinchi kirish: foydalanuvchi yangi parol qo'ymaguncha tizimning boshqa sahifalari yopiq. */
export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.mustChangePassword) redirect(homeFor(user.role));
  const { t } = await getT();
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
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-royal/10 text-royal"><KeyRound className="size-5" /></span>
              <div>
                <h1 className="text-lg font-bold text-midnight">{t("Yangi parol qo'ying")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("{name}, siz tizimga birinchi marta kirdingiz. Davom etish uchun o'zingizga yangi parol o'ylab toping. Boshlang'ich parol bilan qayta kirib bo'lmaydi.", { name: user.fullName })}
                </p>
              </div>
            </div>
            <ChangePasswordForm firstLogin />
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground"><LogOut /> {t("Tizimdan chiqish")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
