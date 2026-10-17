"use client";

import { ShieldAlert } from "lucide-react";
import { useT } from "@/i18n/client";

export type ExamFlags = { tab: number; copy: number; device: number };

/** Imtihon paytidagi shubhali harakatlar: boshqa oynaga o'tish, nusxa olish, boshqa qurilma. */
export function SuspicionBadge({ flags, detailed = false }: { flags: ExamFlags; detailed?: boolean }) {
  const { t } = useT();
  const total = flags.tab + flags.copy + flags.device;
  if (!total) return detailed ? <span className="text-sm text-muted-foreground">{t("Shubhali harakat qayd etilmagan")}</span> : null;
  const parts = [
    flags.tab ? t("boshqa oynaga o'tish: {n}", { n: flags.tab }) : null,
    flags.copy ? t("nusxa olishga urinish: {n}", { n: flags.copy }) : null,
    flags.device ? t("boshqa qurilma/sessiya: {n}", { n: flags.device }) : null,
  ].filter(Boolean);
  const text = parts.join(", ");
  if (detailed) {
    return (
      <span className="inline-flex items-start gap-1.5 text-sm font-medium text-[#b77a1d]">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" /> {text}
      </span>
    );
  }
  return (
    <span title={text} aria-label={text} className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-[#b77a1d]">
      <ShieldAlert className="size-3.5" /> {total}
    </span>
  );
}
