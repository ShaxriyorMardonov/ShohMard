"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { SamuLogo } from "@/components/brand/samu-logo";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; also?: string[] };

type NavRole = "ADMIN" | "MANAGER" | "STUDENT";

const NAV: Record<NavRole, Item[]> = {
  STUDENT: [
    { href: "/student", label: "Bosh sahifa", icon: LayoutDashboard, exact: true },
    { href: "/student/tests", label: "Mavjud testlar", icon: BookOpenCheck },
    { href: "/student/history", label: "Testlar tarixi", icon: History },
    { href: "/student/results", label: "Natijalarim", icon: BarChart3 },
    { href: "/student/profile", label: "Profil", icon: UserRound },
  ],
  ADMIN: [
    { href: "/admin", label: "Bosh sahifa", icon: LayoutDashboard, exact: true },
    { href: "/admin/universities", label: "Universitetlar", icon: Building2 },
    { href: "/admin/students", label: "Talabalar", icon: Users },
    { href: "/admin/tests", label: "Testlar", icon: ClipboardList, also: ["/admin/questions"] },
    { href: "/admin/results", label: "Natijalar", icon: BarChart3 },
    { href: "/admin/users", label: "Rollar", icon: ShieldCheck },
    { href: "/admin/settings", label: "Sozlamalar", icon: Settings },
  ],
  MANAGER: [
    { href: "/admin/tests", label: "Testlar", icon: ClipboardList },
    { href: "/admin/students", label: "Talabalar", icon: Users },
    { href: "/admin/settings", label: "Sozlamalar", icon: Settings },
  ],
};

function NavLinks({ role, onNavigate }: { role: NavRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useT();
  return (
    <nav className="grid gap-1" aria-label={t("Asosiy menyu")}>
      {NAV[role].map(({ href, label, icon: Icon, exact, also = [] }) => {
        const active = exact
          ? pathname === href
          : [href, ...also].some((h) => pathname === h || pathname.startsWith(h + "/"));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-royal text-white shadow-sm" : "text-white/70 hover:bg-white/8 hover:text-white",
            )}
          >
            <Icon className="size-[18px]" />
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ role, footer }: { role: NavRole; footer?: React.ReactNode }) {
  const { t } = useT();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col bg-midnight px-4 py-6 lg:flex">
      <div className="px-2">
        <SamuLogo tone="dark" size="sm" />
        <p className="mt-2 text-[11px] font-medium text-white/45">
          {t(role === "ADMIN" ? "Super admin paneli" : role === "MANAGER" ? "Menejer paneli" : "Talaba kabineti")}
        </p>
      </div>
      <div className="mt-8 flex-1 overflow-y-auto">
        <NavLinks role={role} />
      </div>
      {footer}
    </aside>
  );
}

export function MobileNav({ role }: { role: NavRole }) {
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex size-10 items-center justify-center rounded-lg text-midnight hover:bg-muted lg:hidden cursor-pointer"
        aria-label={t("Menyuni ochish")}
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t("Asosiy menyu")}>
          <div className="absolute inset-0 bg-midnight/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-midnight px-4 py-5 shadow-xl">
            <div className="flex items-center justify-between px-2">
              <SamuLogo tone="dark" size="sm" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 cursor-pointer"
                aria-label={t("Menyuni yopish")}
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">
              <NavLinks role={role} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
