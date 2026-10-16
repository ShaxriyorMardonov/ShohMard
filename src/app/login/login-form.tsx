"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { AlertCircle, LogIn } from "lucide-react";
import { loginAction } from "@/actions/auth";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";

export function LoginForm({ notice }: { notice?: string }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(loginAction);
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-5" noValidate>
      {(state.message || notice) && (
        <Alert variant="error">
          <AlertCircle />
          <span>{state.message ? t(state.message) : notice}</span>
        </Alert>
      )}
      <Field label={t("Login")} htmlFor="login" error={e.login}>
        <Input
          id="login"
          name="login"
          autoComplete="username"
          placeholder={t("Masalan: student.ali")}
          aria-invalid={!!e.login}
          aria-describedby={e.login ? "login-error" : undefined}
          autoFocus
          required
        />
      </Field>
      <Field label={t("Parol")} htmlFor="password" error={e.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder={t("Parolingizni kiriting")}
          aria-invalid={!!e.password}
          aria-describedby={e.password ? "password-error" : undefined}
          required
        />
      </Field>
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText={t("Tekshirilmoqda...")}>
        <LogIn />
        {t("Tizimga kirish")}
      </SubmitButton>
    </form>
  );
}
