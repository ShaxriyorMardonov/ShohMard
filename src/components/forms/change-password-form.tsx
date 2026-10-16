"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";
import { changePasswordAction } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "./field";
import { PasswordInput } from "./password-input";

export function ChangePasswordForm() {
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
          <span>{state.message}</span>
        </Alert>
      )}
      <Field label="Joriy parol" htmlFor="currentPassword" error={e.currentPassword}>
        <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" aria-invalid={!!e.currentPassword} />
      </Field>
      <Field label="Yangi parol" htmlFor="newPassword" error={e.newPassword} hint="Kamida 8 ta belgi, harf va raqam bilan">
        <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" aria-invalid={!!e.newPassword} />
      </Field>
      <Field label="Yangi parolni tasdiqlang" htmlFor="confirmPassword" error={e.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" aria-invalid={!!e.confirmPassword} />
      </Field>
      <div>
        <SubmitButton pending={pending} pendingText="Saqlanmoqda...">Parolni yangilash</SubmitButton>
      </div>
    </form>
  );
}
