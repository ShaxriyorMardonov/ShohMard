"use client";

import { SamuLogo } from "@/components/brand/samu-logo";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <SamuLogo />
      <div>
        <h1 className="text-xl font-bold text-midnight">Kutilmagan xatolik yuz berdi</h1>
        <p className="mt-1 text-sm text-muted-foreground">Iltimos, qayta urinib ko&apos;ring. Muammo takrorlansa, administratorga murojaat qiling.</p>
      </div>
      <Button onClick={reset}>Qayta urinish</Button>
    </main>
  );
}
