import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export async function Pagination({ page, pages, total, params }: { page: number; pages: number; total: number; params: Record<string, string | undefined> }) {
  const { t } = await getT();
  if (pages <= 1) return <p className="px-4 py-3 text-xs text-muted-foreground">{t("Jami: {total}", { total })}</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `?${sp.toString()}`;
  };
  return (
    <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
      <p className="text-xs text-muted-foreground">{t("Jami: {total} · {page}/{pages}-sahifa", { total, page, pages })}</p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button asChild size="sm" variant="outline"><Link href={href(page - 1)}><ChevronLeft /> {t("Oldingi")}</Link></Button>
        ) : (
          <Button size="sm" variant="outline" disabled><ChevronLeft /> {t("Oldingi")}</Button>
        )}
        {page < pages ? (
          <Button asChild size="sm" variant="outline"><Link href={href(page + 1)}>{t("Keyingi")} <ChevronRight /></Link></Button>
        ) : (
          <Button size="sm" variant="outline" disabled>{t("Keyingi")} <ChevronRight /></Button>
        )}
      </div>
    </div>
  );
}

export function parsePage(v: string | undefined) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : 1;
}
