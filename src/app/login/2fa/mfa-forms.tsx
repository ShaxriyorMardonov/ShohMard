"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, Copy, KeyRound } from "lucide-react";
import { setupMfaAction, verifyMfaAction } from "@/actions/auth";
import { Field } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";

function CodeInput({ error, allowRecovery = false }: { error?: string; allowRecovery?: boolean }) {
  const { t } = useT();
  return (
    <Field
      label={t("Tasdiqlash kodi")}
      htmlFor="code"
      error={error ? t(error) : undefined}
      hint={allowRecovery ? t("Telefon yonida bo'lmasa, zaxira kodlardan birini kiriting.") : undefined}
    >
      <Input
        id="code"
        name="code"
        inputMode={allowRecovery ? "text" : "numeric"}
        autoComplete="one-time-code"
        placeholder="123456"
        maxLength={allowRecovery ? 12 : 6}
        className="text-center font-mono text-lg tracking-[0.3em]"
        aria-invalid={!!error}
        autoFocus
        required
      />
    </Field>
  );
}

export function MfaVerifyForm() {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(verifyMfaAction);
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {state.message && (
        <Alert variant="error"><AlertCircle /><span>{t(state.message)}</span></Alert>
      )}
      <CodeInput error={state.errors?.code} allowRecovery />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText={t("Tekshirilmoqda...")}>
        {t("Tasdiqlash")}
      </SubmitButton>
    </form>
  );
}

export function MfaSetupForm({ qrSvg, secret, next }: { qrSvg: string; secret: string; next: string }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(setupMfaAction);
  if (state.ok && state.recoveryCodes) {
    const text = state.recoveryCodes.join("\n");
    return (
      <div className="grid gap-4">
        <Alert variant="success"><KeyRound /><span>{t("Ikki bosqichli tasdiqlash yoqildi.")}</span></Alert>
        <div>
          <p className="text-sm font-semibold text-midnight">{t("Zaxira kodlar")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Telefon yo'qolsa, shu kodlar bilan kirasiz. Har biri bir marta ishlaydi. Ularni xavfsiz joyga yozib qo'ying: ular boshqa ko'rsatilmaydi.")}
          </p>
          <pre className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-3 text-center font-mono text-sm">
            {state.recoveryCodes.map((c) => <span key={c}>{c}</span>)}
          </pre>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => navigator.clipboard?.writeText(text)}>
            <Copy /> {t("Nusxa olish")}
          </Button>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href={next}>{t("Kodlarni saqladim, davom etish")} <ArrowRight /></Link>
        </Button>
      </div>
    );
  }
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {state.message && (
        <Alert variant="error"><AlertCircle /><span>{t(state.message)}</span></Alert>
      )}
      <ol className="grid gap-3 text-sm text-muted-foreground">
        <li>
          <b className="text-midnight">1.</b> {t("Ilovada yangi hisob qo'shing va shu QR kodni skanerlang:")}
          <div className="mx-auto mt-2 w-44 rounded-lg border bg-white p-2 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <p className="mt-2 text-center text-xs">
            {t("Skanerlab bo'lmasa, kalitni qo'lda kiriting:")} <code className="block break-all font-mono text-[13px] font-semibold text-midnight">{secret}</code>
          </p>
        </li>
        <li><b className="text-midnight">2.</b> {t("Ilova ko'rsatgan 6 xonali kodni kiriting:")}</li>
      </ol>
      <CodeInput error={state.errors?.code} />
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText={t("Tekshirilmoqda...")}>
        {t("Ulash va davom etish")}
      </SubmitButton>
    </form>
  );
}
