"use client";

import Link from "next/link";
import { AlertCircle, UserPlus } from "lucide-react";
import { registerParticipantAction } from "@/actions/olympiad";
import { Captcha } from "@/components/forms/captcha";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";

export function RegisterForm({ captchaSiteKey }: { captchaSiteKey?: string | null }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(registerParticipantAction);
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      {state.message && (
        <Alert variant="error"><AlertCircle /><span>{t(state.message)}</span></Alert>
      )}
      <Field label={t("Familiya, ism, otasining ismi")} htmlFor="r-name" error={e.fullName} hint={t("Sertifikatda shu ko'rinishda yoziladi")}>
        <Input id="r-name" name="fullName" autoComplete="name" placeholder={t("Masalan: Aliyev Vali Karimovich")} aria-invalid={!!e.fullName} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Telefon")} htmlFor="r-phone" error={e.phone}>
          <Input id="r-phone" name="phone" type="tel" autoComplete="tel" placeholder="+998 90 123 45 67" aria-invalid={!!e.phone} required />
        </Field>
        <Field label={t("O'quv muassasasi")} htmlFor="r-org" error={e.organization}>
          <Input id="r-org" name="organization" autoComplete="organization" placeholder={t("Maktab, litsey yoki OTM")} aria-invalid={!!e.organization} required />
        </Field>
      </div>
      <Field label={t("Login")} htmlFor="r-login" error={e.login} hint={t("Lotin harflari va raqamlar, masalan: vali.aliyev")}>
        <Input id="r-login" name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} aria-invalid={!!e.login} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Parol")} htmlFor="r-pass" error={e.password} hint={t("Kamida 8 ta belgi, harf va raqam bilan")}>
          <PasswordInput id="r-pass" name="password" autoComplete="new-password" aria-invalid={!!e.password} required />
        </Field>
        <Field label={t("Parolni takrorlang")} htmlFor="r-pass2" error={e.confirmPassword}>
          <PasswordInput id="r-pass2" name="confirmPassword" autoComplete="new-password" aria-invalid={!!e.confirmPassword} required />
        </Field>
      </div>
      {captchaSiteKey && <Captcha key={JSON.stringify(state)} siteKey={captchaSiteKey} />}
      <SubmitButton pending={pending} size="lg" className="w-full" pendingText={t("Saqlanmoqda...")}>
        <UserPlus /> {t("Ro'yxatdan o'tish")}
      </SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {t("Hisobingiz bormi?")} <Link href="/login" className="font-semibold text-royal hover:underline">{t("Tizimga kirish")}</Link>
      </p>
    </form>
  );
}
