"use client";

import * as React from "react";
import type { Role } from "@prisma/client";
import { saveStaffUserAction } from "@/actions/admin";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/validation";

export type StaffRow = { id: string; fullName: string; login: string; roles: Role[]; universityId: string | null; isActive: boolean; email?: string | null; emailVerifiedAt?: Date | string | null };

const ROLE_OPTIONS: { value: Role; label: string; hint: string }[] = [
  { value: "ADMIN", label: "Super admin", hint: "Hamma narsani boshqaradi" },
  { value: "MANAGER", label: "Universitet menejeri", hint: "Talaba yuklash, test yaratish va vaqtini ochish" },
  { value: "STUDENT", label: "Talaba", hint: "Test topshiradi va natijasini ko'radi" },
];

function StaffForm({ user, universities, isSelf, onDone }: { user?: StaffRow; universities: { id: string; name: string }[]; isSelf: boolean; onDone: () => void }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(async (prev: FormState, fd: FormData) => {
    const res = await saveStaffUserAction(prev, fd);
    if (res.ok) onDone();
    return res;
  });
  const [roles, setRoles] = React.useState<Role[]>(user?.roles ?? ["MANAGER"]);
  const toggle = (r: Role) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {user && <input type="hidden" name="id" value={user.id} />}
      {state.message && !state.ok && <p className="text-sm font-medium text-error">{t(state.message)}</p>}
      <Field label={t("F.I.Sh.")} htmlFor="u-name" error={e.fullName}>
        <Input id="u-name" name="fullName" defaultValue={user?.fullName} aria-invalid={!!e.fullName} />
      </Field>
      <Field label={t("Login")} htmlFor="u-login" error={e.login}>
        <Input id="u-login" name="login" defaultValue={user?.login} autoComplete="off" aria-invalid={!!e.login} />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-semibold text-midnight">{t("Rollar")}</legend>
        {ROLE_OPTIONS.map((o) => {
          const lockedOn = isSelf && o.value === "ADMIN";
          return (
            <label key={o.value} className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-royal has-[:checked]:bg-royal/5">
              <input
                type="checkbox"
                name="roles"
                value={o.value}
                checked={roles.includes(o.value)}
                disabled={lockedOn}
                onChange={() => toggle(o.value)}
                className="mt-0.5 size-4 accent-[#315ECA]"
              />
              {lockedOn && <input type="hidden" name="roles" value="ADMIN" />}
              <span>
                <span className="block font-medium">{t(o.label)}</span>
                <span className="text-xs text-muted-foreground">{t(o.hint)}</span>
              </span>
            </label>
          );
        })}
        {e.roles && <p className="text-xs font-medium text-error">{t(e.roles)}</p>}
        <p className="text-xs text-muted-foreground">{t("Bir nechta rol berilsa, foydalanuvchi ularni ekranning o'ng yuqorisidagi ismini bosib almashtiradi.")}</p>
      </fieldset>
      {(roles.includes("MANAGER") || roles.includes("STUDENT")) && (
        <Field label={t("Universitet")} htmlFor="u-uni" error={e.universityId} hint={t("Menejer va talaba roli shu universitetga tegishli bo'ladi")}>
          <NativeSelect id="u-uni" name="universityId" defaultValue={user?.universityId ?? ""} aria-invalid={!!e.universityId}>
            <option value="" disabled>{t("Universitetni tanlang")}</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </NativeSelect>
        </Field>
      )}
      <Field label={user ? t("Yangi parol (ixtiyoriy)") : t("Parol")} htmlFor="u-pass" error={e.password} hint={user ? t("Bo'sh qoldirilsa, parol o'zgarmaydi") : t("Kamida 8 ta belgi, harf va raqam bilan")}>
        <PasswordInput id="u-pass" name="password" autoComplete="new-password" aria-invalid={!!e.password} />
      </Field>
      {isSelf ? (
        <input type="hidden" name="isActive" value="on" />
      ) : (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} className="size-4 accent-[#315ECA]" />
          {t("Hisob faol")}
        </label>
      )}
      {user && !isSelf && user.emailVerifiedAt && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="resetMfa" className="mt-0.5 size-4 accent-[#315ECA]" />
          <span>
            {t("Tasdiqlash emailini qayta o'rnatish")} {user.email && <span className="font-mono text-xs">({user.email})</span>}
            <span className="block text-xs text-muted-foreground">{t("Pochtasiga kira olmasa: keyingi kirishda yangi Gmail manzilini tasdiqlaydi.")}</span>
          </span>
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>{t("Bekor qilish")}</Button>
        <SubmitButton pending={pending} pendingText={t("Saqlanmoqda...")}>{t("Saqlash")}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function StaffDialog({ user, universities, isSelf = false, trigger }: { user?: StaffRow; universities: { id: string; name: string }[]; isSelf?: boolean; trigger: React.ReactNode }) {
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? t("Foydalanuvchini tahrirlash") : t("Yangi foydalanuvchi")}</DialogTitle>
          <DialogDescription>{t("Menejer talabalarni yuklaydi, test yaratadi va test vaqtini ochadi. Super admin hamma narsani boshqaradi.")}</DialogDescription>
        </DialogHeader>
        {open && <StaffForm user={user} universities={universities} isSelf={isSelf} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
