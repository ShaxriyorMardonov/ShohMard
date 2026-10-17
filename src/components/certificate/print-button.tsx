"use client";

import { useEffect } from "react";
import { Languages, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function PrintButton() {
  const { t } = useT();
  return (
    <Button onClick={() => window.print()}>
      <Printer /> {t("Yuklab olish (PDF) / chop etish")}
    </Button>
  );
}

/** Sertifikatning 4 tildagi versiyasini bitta PDF (4 varaq) qilib saqlash sahifasiga o'tadi. */
export function PrintAllLangsButton({ href }: { href: string }) {
  const { t } = useT();
  return (
    <Button asChild variant="outline">
      <a href={href}>
        <Languages /> {t("4 tilda yuklab olish (PDF)")}
      </a>
    </Button>
  );
}

/** Sahifa yuklangach chop etish (PDF saqlash) oynasini ochadi. */
export function AutoPrint() {
  useEffect(() => {
    const id = setTimeout(() => window.print(), 600);
    return () => clearTimeout(id);
  }, []);
  return null;
}
