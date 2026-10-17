"use client";

import * as React from "react";
import type { Role } from "@prisma/client";
import { Check, ChevronDown, LogOut, Repeat } from "lucide-react";
import { logoutAction, switchRoleAction } from "@/actions/auth";
import { useT } from "@/i18n/client";
import type { TFunction } from "@/i18n/translate";
import { cn } from "@/lib/utils";
import { LangSwitcher } from "./lang-switcher";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function roleTitle(role: Role, uni: string | null | undefined, t: TFunction) {
  if (role === "ADMIN") return t("Super admin");
  if (role === "MANAGER") return `${t("Menejer")}${uni ? ` · ${uni}` : ""}`;
  if (role === "PARTICIPANT") return t("Olimpiada ishtirokchisi");
  return `${t("Talaba")}${uni ? ` · ${uni}` : ""}`;
}

/** Ekranning o'ng yuqori burchagidagi foydalanuvchi menyusi: rolni almashtirish va chiqish. */
export function UserMenu({ fullName, role, roles, university }: { fullName: string; role: Role; roles: Role[]; university: string | null }) {
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const many = roles.length > 1;

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-right transition-colors hover:bg-muted"
      >
        <span className="hidden sm:block">
          <span className="block text-sm font-semibold leading-tight text-foreground">{fullName}</span>
          <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            {many && <Repeat className="size-3" />}
            {roleTitle(role, university, t)}
          </span>
        </span>
        <span className="flex size-9 items-center justify-center rounded-full bg-royal text-sm font-bold text-white" aria-hidden>
          {initials(fullName)}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border bg-card p-1.5 shadow-xl">
          <div className="px-3 py-2 sm:hidden">
            <p className="text-sm font-semibold text-midnight">{fullName}</p>
            <p className="text-xs text-muted-foreground">{roleTitle(role, university, t)}</p>
          </div>
          {many && (
            <>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t("Rolni almashtirish")}</p>
              {roles.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="menuitemradio"
                  aria-checked={r === role}
                  disabled={pending || r === role}
                  onClick={() => start(() => switchRoleAction(r))}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-default",
                    r === role ? "font-semibold text-royal" : "text-foreground",
                  )}
                >
                  {roleTitle(r, university, t)}
                  {r === role && <Check className="size-4" />}
                </button>
              ))}
              <div className="my-1 border-t" />
            </>
          )}
          <LangSwitcher className="py-1.5" />
          <div className="my-1 border-t" />
          <form action={logoutAction}>
            <button type="submit" role="menuitem" className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-error hover:bg-error/10">
              <LogOut className="size-4" /> {t("Tizimdan chiqish")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
