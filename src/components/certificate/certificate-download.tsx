"use client";

import * as React from "react";
import { Award, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANG_LABEL, LOCALES } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { isOlympiad } from "@/lib/olympiad";
import type { TestKind } from "@prisma/client";

const MENU_H = 200;

/**
 * Diplom/sertifikatni tanlangan tilda yuklab olish: til bosilganda hujjat yangi oynada
 * ochiladi va PDF sifatida saqlash (chop etish) oynasi avtomatik chiqadi.
 * Menyu jadval kartochkasi (overflow-hidden) ichida kesilmasligi uchun fixed holatda ochiladi.
 */
export function CertificateDownload({ attemptId, kind, compact = false, className }: { attemptId: string; kind?: TestKind; compact?: boolean; className?: string }) {
  const { t } = useT();
  const [pos, setPos] = React.useState<React.CSSProperties | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);
  const label = isOlympiad(kind ?? "REGULAR") ? t("Diplomni yuklab olish") : t("Sertifikatni yuklab olish");

  const toggle = () => {
    if (pos) return setPos(null);
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const right = window.innerWidth - r.right;
    setPos(r.bottom + MENU_H > window.innerHeight ? { right, bottom: window.innerHeight - r.top + 4 } : { right, top: r.bottom + 4 });
  };

  React.useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPos(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    const close = () => setPos(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  return (
    <div ref={ref} className={`inline-block ${className ?? ""}`}>
      <Button
        type="button"
        size={compact ? "icon-sm" : "sm"}
        variant={compact ? "ghost" : "success"}
        className={compact ? "text-royal hover:bg-royal/10" : undefined}
        aria-label={label}
        title={label}
        aria-expanded={!!pos}
        onClick={toggle}
      >
        <Award />
        {!compact && (
          <>
            {label} <ChevronDown />
          </>
        )}
      </Button>
      {pos && (
        <div role="menu" style={pos} className="fixed z-50 w-48 overflow-hidden rounded-lg border bg-white py-1 shadow-lg">
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Tilni tanlang")}</p>
          {LOCALES.map((l) => (
            <a
              key={l}
              role="menuitem"
              href={`/certificate/${attemptId}?lang=${l}&print=1`}
              target="_blank"
              rel="noopener"
              onClick={() => setPos(null)}
              className="block px-3 py-2 text-sm font-medium text-midnight hover:bg-muted"
            >
              {LANG_LABEL[l]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
