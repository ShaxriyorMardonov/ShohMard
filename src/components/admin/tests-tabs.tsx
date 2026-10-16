import Link from "next/link";
import { ClipboardList, Library } from "lucide-react";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";

/** Testlar bo'limi ichidagi yorliqlar: testlar ro'yxati va savollar banki (faqat Super admin). */
export async function TestsTabs({ active, showBank }: { active: "tests" | "bank"; showBank: boolean }) {
  if (!showBank) return null;
  const { t } = await getT();
  const tabs = [
    { key: "tests", href: "/admin/tests", label: t("Testlar"), icon: ClipboardList },
    { key: "bank", href: "/admin/questions", label: t("Savollar banki"), icon: Library },
  ] as const;
  return (
    <div className="mb-5 flex gap-1 border-b border-border" role="tablist">
      {tabs.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          role="tab"
          aria-selected={active === key}
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
            active === key ? "border-royal text-royal" : "border-transparent text-muted-foreground hover:text-midnight",
          )}
        >
          <Icon className="size-4" /> {label}
        </Link>
      ))}
    </div>
  );
}
