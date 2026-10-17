"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, GraduationCap } from "lucide-react";
import { saveSupervisorAction } from "@/actions/olympiad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";

/** Diplom sahifasida ilmiy rahbarni kiritish (diplomda darhol ko'rinadi). */
export function SupervisorForm({ attemptId, initial }: { attemptId: string; initial: string | null }) {
  const { t } = useT();
  const router = useRouter();
  const [value, setValue] = React.useState(initial ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, start] = React.useTransition();
  return (
    <form
      className="mx-auto mb-4 grid max-w-[820px] gap-2 rounded-xl border border-border bg-card p-3 print:hidden sm:grid-cols-[1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSupervisorAction(attemptId, value);
          setError(r.error ?? null);
          setSaved(!!r.ok);
          if (r.ok) router.refresh();
        });
      }}
    >
      <label className="grid gap-1.5 text-sm font-medium" htmlFor="supervisor">
        <span className="flex items-center gap-1.5"><GraduationCap className="size-4 text-royal" /> {t("Ilmiy rahbar (ixtiyoriy)")}</span>
        <Input
          id="supervisor"
          value={value}
          maxLength={120}
          placeholder={t("Masalan: Yusupova Dildora Uktamovna")}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          aria-invalid={!!error}
        />
        {error ? <span className="text-xs text-error">{t(error)}</span> : <span className="text-xs text-muted-foreground">{t("Diplomda ko'rsatiladi. Saqlagach, PDF ni qayta yuklab oling.")}</span>}
      </label>
      <Button type="submit" variant="outline" disabled={pending}>
        {saved ? <Check /> : null} {saved ? t("Saqlandi") : t("Saqlash")}
      </Button>
    </form>
  );
}
