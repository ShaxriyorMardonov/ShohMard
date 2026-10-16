"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { changePasswordAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import { Field } from "./field";
import { PasswordInput } from "./password-input";

export function ChangePasswordForm({ firstLogin = false }: { firstLogin?: boolean }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(changePasswordAction);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const e = state.errors ?? {};
  return (
    <form ref={ref} onSubmit={onSubmit} className="grid max-w-md gap-4">
      {state.ok && (
        <Alert variant="success">
          <CheckCircle2 />
          <span>{state.message ? t(state.message) : null}</span>
        </Alert>
      )}
      {!firstLogin && (
        <Field label={t("Joriy parol")} htmlFor="currentPassword" error={e.currentPassword}>
          <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" aria-invalid={!!e.currentPassword} />
        </Field>
      )}
      <Field label={t("Yangi parol")} htmlFor="newPassword" error={e.newPassword} hint={t("Kamida 8 ta belgi, harf va raqam bilan")}>
        <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" aria-invalid={!!e.newPassword} />
      </Field>
      <Field label={t("Yangi parolni tasdiqlang")} htmlFor="confirmPassword" error={e.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" aria-invalid={!!e.confirmPassword} />
      </Field>
      <div>
        <SubmitButton pending={pending} pendingText={t("Saqlanmoqda...")}>{t("Parolni yangilash")}</SubmitButton>
      </div>
    </form>
  );
}
