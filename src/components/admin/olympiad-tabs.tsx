import Link from "next/link";
import { BarChart3, ClipboardList, UsersRound } from "lucide-react";
import { getT } from "@/i18n/server";
import type { OlympiadSlug } from "@/lib/olympiad";
import { cn } from "@/lib/utils";

/** Olimpiada bo'limi ichidagi yorliqlar: testlar, natijalar va ishtirokchilar. */
export async function OlympiadTabs({ slug, active }: { slug: OlympiadSlug; active: "tests" | "results" | "participants" }) {
  const { t } = await getT();
  const base = `/admin/olympiads/${slug}`;
  const tabs = [
    { key: "tests", href: base, label: t("Olimpiada testlari"), icon: ClipboardList },
    { key: "results", href: `${base}/results`, label: t("Natijalar"), icon: BarChart3 },
    { key: "participants", href: `${base}/participants`, label: t("Ishtirokchilar"), icon: UsersRound },
  ] as const;
  return (
    <div className="mb-5 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
      {tabs.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          role="tab"
          aria-selected={active === key}
          className={cn(
            "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            active === key ? "border-royal text-royal" : "border-transparent text-muted-foreground hover:text-midnight",
          )}
        >
          <Icon className="size-4" /> {label}
        </Link>
      ))}
    </div>
  );
}
