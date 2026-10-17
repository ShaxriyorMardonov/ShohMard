import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { SamuLogo } from "@/components/brand/samu-logo";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { getT } from "@/i18n/server";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { captchaSiteKey } from "@/lib/captcha";
import { RegisterForm } from "./register-form";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Olimpiadaga ro'yxatdan o'tish") };
}

/** Olimpiadada qatnashmoqchi bo'lgan tashqi ishtirokchilar uchun ochiq ro'yxatdan o'tish. */
export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "STUDENT" ? "/olympiad" : homeFor(user.role));
  const { t } = await getT();
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <SamuLogo size="md" />
          <LangSwitcher compact className="w-40" />
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-royal/10 text-royal"><Trophy className="size-5" /></span>
            <div>
              <h1 className="text-xl font-extrabold text-midnight">{t("Olimpiadaga ro'yxatdan o'tish")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Xalqaro va mahalliy olimpiadalarda qatnashish uchun hisob yarating. Universitet talabalari ro'yxatdan o'tmaydi: ular o'z logini bilan kiradi.")}
              </p>
            </div>
          </div>
          <RegisterForm captchaSiteKey={captchaSiteKey()} />
        </div>
      </div>
    </main>
  );
}
