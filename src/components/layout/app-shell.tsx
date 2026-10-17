import { SamuLogo } from "@/components/brand/samu-logo";
import type { CurrentUser } from "@/lib/auth";
import { MobileNav, MobileNavProvider, MobileTabBar, Sidebar } from "./nav";
import { UserMenu } from "./user-menu";

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  return (
    <MobileNavProvider role={user.role}>
    <div className="flex min-h-dvh">
      <Sidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-card/90 px-4 backdrop-blur sm:h-16 sm:px-6">
          <MobileNav />
          <div className="lg:hidden">
            <SamuLogo size="sm" />
          </div>
          <UserMenu fullName={user.fullName} role={user.role} roles={user.roles} university={user.university?.shortName ?? null} />
        </header>
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 pb-24 pt-5 sm:px-6 lg:py-8">{children}</main>
      </div>
      <MobileTabBar role={user.role} />
    </div>
    </MobileNavProvider>
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
        <h1 className="text-xl font-extrabold tracking-tight text-midnight sm:text-2xl">{title}</h1>
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
    <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:gap-4 sm:p-5">
      <span className={`flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5 ${toneCls}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-extrabold text-midnight sm:text-2xl">{value}</p>
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
