import { SamuLogo } from "@/components/brand/samu-logo";
import type { CurrentUser } from "@/lib/auth";
import { MobileNav, Sidebar } from "./nav";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const subtitle = user.role === "ADMIN" ? "Administrator" : (user.university?.shortName ?? "Talaba");
  return (
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-card/90 px-4 backdrop-blur sm:px-6">
          <MobileNav role={user.role} />
          <div className="lg:hidden">
            <SamuLogo size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-foreground">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
            <span className="flex size-9 items-center justify-center rounded-full bg-royal text-sm font-bold text-white" aria-hidden>
              {initials(user.fullName)}
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-midnight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "royal",
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "royal" | "success" | "warning" | "midnight";
}) {
  const toneCls = {
    royal: "bg-royal/10 text-royal",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-[#b77a1d]",
    midnight: "bg-midnight/8 text-midnight",
  }[tone];
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)]">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 ${toneCls}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-extrabold text-midnight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-royal [&_svg]:size-6">{icon}</span>
      <p className="mt-4 font-bold text-midnight">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
