"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { setLangAction } from "@/actions/lang";
import { LANG_LABEL, LOCALES } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Tilni tanlash: o'zbek (lotin), o'zbek (kirill), rus, ingliz. */
export function LangSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t, lang } = useT();
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <div className={cn("grid gap-1", className)} role="group" aria-label={t("Til")}>
      {!compact && (
        <p className="flex items-center gap-1.5 px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Globe className="size-3.5" /> {t("Til")}
        </p>
      )}
      <div className="grid grid-cols-2 gap-1 px-1.5">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            disabled={pending}
            aria-pressed={l === lang}
            onClick={() =>
              start(async () => {
                await setLangAction(l);
                router.refresh();
              })
            }
            className={cn(
              "cursor-pointer rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              l === lang ? "bg-royal text-white" : "bg-muted/60 text-foreground hover:bg-muted",
            )}
          >
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
