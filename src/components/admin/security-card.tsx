"use client";

import * as React from "react";
import { LogOut, Monitor, Smartphone } from "lucide-react";
import { logoutOtherSessionsAction } from "@/actions/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export type SessionRow = { id: string; current: boolean; ip: string | null; device: string; mobile: boolean; lastSeen: string };

export function SessionsList({ sessions }: { sessions: SessionRow[] }) {
  const { t } = useT();
  const [pending, start] = React.useTransition();
  const others = sessions.filter((s) => !s.current).length;
  return (
    <div className="grid gap-3">
      <ul className="divide-y rounded-lg border">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            {s.mobile ? <Smartphone className="size-4 shrink-0 text-muted-foreground" /> : <Monitor className="size-4 shrink-0 text-muted-foreground" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-midnight">{s.device}</p>
              <p className="text-xs text-muted-foreground">{s.ip ?? "—"} · {s.lastSeen}</p>
            </div>
            {s.current && <Badge variant="success">{t("Shu qurilma")}</Badge>}
          </li>
        ))}
      </ul>
      {others > 0 && (
        <Button type="button" variant="outline" size="sm" className="w-fit" disabled={pending} onClick={() => start(() => logoutOtherSessionsAction())}>
          <LogOut /> {t("Boshqa qurilmalardan chiqish ({n})", { n: others })}
        </Button>
      )}
    </div>
  );
}
