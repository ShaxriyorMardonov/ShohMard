"use client";

import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { useT } from "@/i18n/client";

/** Muhim amalni tasdiqlash uchun joriy parolni qayta so'rash. */
export function ReauthField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string | null }) {
  const { t } = useT();
  return (
    <Field label={t("Tasdiqlash uchun parolingizni kiriting")} htmlFor="reauth-password" error={error ? t(error) : undefined}>
      <PasswordInput
        id="reauth-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="current-password"
        aria-invalid={!!error}
      />
    </Field>
  );
}
