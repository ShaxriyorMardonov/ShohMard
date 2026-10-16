"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/i18n/client";

/** Faol/nofaol almashtirgich: bosilganda server amalini chaqiradi va sahifani yangilaydi. */
export function ToggleSwitch({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => Promise<{ error?: string } | void>;
}) {
  const { t } = useT();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? t("Nofaol qilish") : t("Faollashtirish")}
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            const r = await onToggle(!active);
            setError(r?.error ?? null);
            router.refresh();
          })
        }
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? "bg-success" : "bg-muted-foreground/30"}`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5.5" : "translate-x-0.5"}`} />
      </button>
      {error && <p className="mt-1 max-w-[180px] text-[11px] leading-tight text-error">{t(error)}</p>}
    </div>
  );
}
