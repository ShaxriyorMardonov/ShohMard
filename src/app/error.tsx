"use client";

import { SamuLogo } from "@/components/brand/samu-logo";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <SamuLogo />
      <div>
        <h1 className="text-xl font-bold text-midnight">{t("Kutilmagan xatolik yuz berdi")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("Iltimos, qayta urinib ko'ring. Muammo takrorlansa, administratorga murojaat qiling.")}</p>
      </div>
      <Button onClick={reset}>{t("Qayta urinish")}</Button>
    </main>
  );
}
