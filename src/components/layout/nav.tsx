"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
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

type Item = { href: string; label: string; short?: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; also?: string[] };

type NavRole = "ADMIN" | "MANAGER" | "STUDENT";

const NAV: Record<NavRole, Item[]> = {
  STUDENT: [
    { href: "/student", label: "Bosh sahifa", icon: LayoutDashboard, exact: true },
    { href: "/student/tests", label: "Mavjud testlar", short: "Testlar", icon: BookOpenCheck },
    { href: "/student/history", label: "Testlar tarixi", short: "Tarix", icon: History },
    { href: "/student/results", label: "Natijalarim", short: "Natijalar", icon: BarChart3 },
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
  const isActive = useActive();
  const { t } = useT();
  return (
    <nav className="grid gap-1" aria-label={t("Asosiy menyu")}>
      {NAV[role].map((item) => {
        const { href, label, icon: Icon } = item;
        const active = isActive(item);
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

function useActive() {
  const pathname = usePathname();
  return ({ href, exact, also = [] }: Item) =>
    exact ? pathname === href : [href, ...also].some((h) => pathname === h || pathname.startsWith(h + "/"));
}

/**
 * Telefon menyusi: chap tomondan ochiladigan panel.
 * Panel document.body ga portal orqali chiqariladi — sarlavhadagi backdrop-blur
 * "fixed" elementlarni o'z ichiga qamab qo'ymasligi uchun.
 */
function MobileDrawer({ role, open, onClose }: { role: NavRole; open: boolean; onClose: () => void }) {
  const { t } = useT();
  const pathname = usePathname();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  // Sahifa almashsa panel yopiladi
  React.useEffect(onClose, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true" aria-label={t("Asosiy menyu")}>
      <div className="absolute inset-0 bg-midnight/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-midnight px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-xl">
        <div className="flex items-center justify-between px-2">
          <div>
            <SamuLogo tone="dark" size="sm" />
            <p className="mt-2 text-[11px] font-medium text-white/45">
              {t(role === "ADMIN" ? "Super admin paneli" : role === "MANAGER" ? "Menejer paneli" : "Talaba kabineti")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 cursor-pointer"
            aria-label={t("Menyuni yopish")}
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-6 flex-1 overflow-y-auto">
          <NavLinks role={role} onNavigate={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

const MobileMenuContext = React.createContext<{ open: () => void }>({ open: () => {} });

/** Telefon menyusi holati: yuqoridagi tugma ham, pastki paneldagi "Menyu" ham shu panelni ochadi. */
export function MobileNavProvider({ role, children }: { role: NavRole; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);
  const value = React.useMemo(() => ({ open: () => setOpen(true) }), []);
  return (
    <MobileMenuContext.Provider value={value}>
      {children}
      <MobileDrawer role={role} open={open} onClose={close} />
    </MobileMenuContext.Provider>
  );
}

export function MobileNav() {
  const { t } = useT();
  const { open } = React.useContext(MobileMenuContext);
  return (
    <button
      type="button"
      onClick={open}
      className="-ml-1 flex size-10 items-center justify-center rounded-lg border border-border/70 bg-card text-midnight hover:bg-muted lg:hidden cursor-pointer"
      aria-label={t("Menyuni ochish")}
    >
      <Menu className="size-5" />
    </button>
  );
}

/** Telefonda ekranning pastida doim ko'rinib turadigan asosiy bo'limlar paneli. */
export function MobileTabBar({ role }: { role: NavRole }) {
  const { t } = useT();
  const isActive = useActive();
  const { open } = React.useContext(MobileMenuContext);
  const items = NAV[role];
  const shown = items.length > 5 ? items.slice(0, 4) : items;
  const rest = items.slice(shown.length);
  const restActive = rest.some(isActive);
  const cls = (active: boolean) =>
    cn(
      "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 pt-2 pb-1.5 text-[10.5px] font-semibold leading-tight transition-colors",
      active ? "text-royal" : "text-muted-foreground hover:text-midnight",
    );
  return (
    <nav
      aria-label={t("Asosiy menyu")}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border/70 bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(16,31,61,0.06)] lg:hidden print:hidden"
    >
      {shown.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cls(active)}>
            <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", active && "bg-royal/10")}>
              <Icon className="size-5" />
            </span>
            <span className="w-full truncate text-center">{t(item.short ?? item.label)}</span>
          </Link>
        );
      })}
      {rest.length > 0 && (
        <button type="button" onClick={open} className={cn(cls(restActive), "cursor-pointer")}>
          <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", restActive && "bg-royal/10")}>
            <Menu className="size-5" />
          </span>
          <span className="w-full truncate text-center">{t("Menyu")}</span>
        </button>
      )}
    </nav>
  );
}
