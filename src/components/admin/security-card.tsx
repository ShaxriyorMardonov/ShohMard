"use client";

import * as React from "react";
import { AlertCircle, KeyRound, LogOut, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { logoutOtherSessionsAction, regenerateRecoveryCodesAction } from "@/actions/auth";
import { Field } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
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

export function RecoveryCodesForm({ enabledAt, left }: { enabledAt: string; left: number }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(regenerateRecoveryCodesAction);
  return (
    <div className="grid gap-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-success">
        <ShieldCheck className="size-4" /> {t("Ikki bosqichli tasdiq yoqilgan: {date}", { date: enabledAt })}
      </p>
      <p className="text-muted-foreground">{t("Qolgan zaxira kodlar: {n} ta", { n: left })}</p>
      {state.ok && state.recoveryCodes ? (
        <div>
          <Alert variant="success"><KeyRound /><span>{t("Yangi zaxira kodlar. Ularni xavfsiz joyga yozib qo'ying: ular boshqa ko'rsatilmaydi.")}</span></Alert>
          <pre className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-3 text-center font-mono text-sm">
            {state.recoveryCodes.map((c) => <span key={c}>{c}</span>)}
          </pre>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-2 sm:max-w-xs">
          {state.message && <Alert variant="error"><AlertCircle /><span>{t(state.message)}</span></Alert>}
          <Field label={t("Yangi zaxira kodlar olish uchun ilovadagi kodni kiriting")} htmlFor="rc-code" error={state.errors?.code ? t(state.errors.code) : undefined}>
            <Input id="rc-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" className="font-mono tracking-widest" />
          </Field>
          <SubmitButton pending={pending} size="sm" variant="outline" className="w-fit" pendingText={t("Tekshirilmoqda...")}>
            <KeyRound /> {t("Yangi zaxira kodlar")}
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
