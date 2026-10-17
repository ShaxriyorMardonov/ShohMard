"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Mail, RotateCw } from "lucide-react";
import {
  confirmEmailChangeAction,
  confirmMfaEmailSetupAction,
  resendMfaCodeAction,
  startEmailChangeAction,
  startMfaEmailSetupAction,
  verifyMfaAction,
} from "@/actions/auth";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/validation";

const RESEND_SECONDS = 60;

function useCountdown(initial: number) {
  const [left, setLeft] = React.useState(initial);
  React.useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return [left, setLeft] as const;
}

function CodeField({ error, id = "code" }: { error?: string; id?: string }) {
  const { t } = useT();
  return (
    <Field label={t("Tasdiqlash kodi")} htmlFor={id} error={error ? t(error) : undefined}>
      <Input
        id={id}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={6}
        className="text-center font-mono text-lg tracking-[0.3em]"
        aria-invalid={!!error}
        autoFocus
        required
      />
    </Field>
  );
}

function ErrorAlert({ message }: { message?: string }) {
  const { t } = useT();
  if (!message) return null;
  return <Alert variant="error"><AlertCircle /><span>{t(message)}</span></Alert>;
}

/** Kirishda: emailga yuborilgan kodni kiritish va kerak bo'lsa qayta yuborish. */
export function EmailCodeVerifyForm({ sentTo }: { sentTo: string }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(verifyMfaAction);
  const [left, setLeft] = useCountdown(RESEND_SECONDS);
  const [resend, setResend] = React.useState<FormState>({});
  const [resending, start] = React.useTransition();
  const doResend = () =>
    start(async () => {
      const r = await resendMfaCodeAction();
      setResend(r);
      if (r.ok) setLeft(RESEND_SECONDS);
    });
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
        <Mail className="size-4 shrink-0 text-royal" />
        <span>{t("Kod yuborildi: {email}", { email: sentTo })}</span>
      </p>
      <ErrorAlert message={state.message ?? resend.message} />
      {resend.ok && !state.message && (
        <Alert variant="success"><CheckCircle2 /><span>{t("Yangi kod yuborildi")}</span></Alert>
      )}
      <CodeField error={state.errors?.code} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText={t("Tekshirilmoqda...")}>
        {t("Tasdiqlash")}
      </SubmitButton>
      <Button type="button" variant="outline" size="sm" className="w-full" disabled={left > 0 || resending} onClick={doResend}>
        <RotateCw /> {left > 0 ? t("Kodni qayta yuborish ({n} s)", { n: left }) : t("Kodni qayta yuborish")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("Xat kelmasa, Gmail'dagi \"Spam\" bo'limini ham tekshiring.")}</p>
    </form>
  );
}

/**
 * Email manzilini tasdiqlash: avval manzil (sozlamalarda joriy parol ham), keyin unga kelgan kod.
 * mode="login" — birinchi kirishda, mode="settings" — sozlamalarda emailni almashtirish.
 */
export function EmailSetupForm({ mode, defaultEmail = "" }: { mode: "login" | "settings"; defaultEmail?: string }) {
  const { t } = useT();
  const startForm = useFormAction(mode === "login" ? startMfaEmailSetupAction : startEmailChangeAction);
  const confirmForm = useFormAction(mode === "login" ? confirmMfaEmailSetupAction : confirmEmailChangeAction);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (startForm.state.ok && startForm.state.sentTo) {
      setSentTo(startForm.state.sentTo);
      setDone(null);
    }
  }, [startForm.state]);
  React.useEffect(() => {
    if (confirmForm.state.ok) {
      setSentTo(null);
      setDone(confirmForm.state.message ?? null);
    }
  }, [confirmForm.state]);

  if (sentTo) {
    return (
      <form onSubmit={confirmForm.onSubmit} className="grid gap-3" noValidate>
        <p className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm">
          <Mail className="size-4 shrink-0 text-royal" />
          <span>{t("Kod yuborildi: {email}", { email: sentTo })}</span>
        </p>
        <ErrorAlert message={confirmForm.state.message} />
        <CodeField id={`${mode}-code`} error={confirmForm.state.errors?.code} />
        <SubmitButton pending={confirmForm.pending} size={mode === "login" ? "lg" : "default"} className={mode === "login" ? "w-full" : "w-fit"} pendingText={t("Tekshirilmoqda...")}>
          {t("Tasdiqlash")}
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setSentTo(null)}>
          {t("Boshqa email kiritish")}
        </Button>
      </form>
    );
  }

  const e = startForm.state.errors ?? {};
  return (
    <form onSubmit={startForm.onSubmit} className="grid gap-3" noValidate>
      {done && <Alert variant="success"><CheckCircle2 /><span>{t(done)}</span></Alert>}
      <ErrorAlert message={startForm.state.message} />
      <Field label={t("Gmail manzili")} htmlFor={`${mode}-email`} error={e.email ? t(e.email) : undefined} hint={t("Har safar kirishda shu manzilga 6 xonali kod keladi")}>
        <Input id={`${mode}-email`} name="email" type="email" autoComplete="email" placeholder="nom@gmail.com" defaultValue={defaultEmail} aria-invalid={!!e.email} required />
      </Field>
      {mode === "settings" && (
        <Field label={t("Joriy parol")} htmlFor="settings-email-pass" error={e.password ? t(e.password) : undefined}>
          <PasswordInput id="settings-email-pass" name="password" autoComplete="current-password" aria-invalid={!!e.password} required />
        </Field>
      )}
      <SubmitButton pending={startForm.pending} size={mode === "login" ? "lg" : "default"} className={mode === "login" ? "w-full" : "w-fit"} pendingText={t("Yuborilmoqda...")}>
        <Mail /> {t("Kod yuborish")}
      </SubmitButton>
    </form>
  );
}
