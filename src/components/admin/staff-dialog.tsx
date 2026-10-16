"use client";

import * as React from "react";
import { saveStaffUserAction } from "@/actions/admin";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/validation";

export type StaffRow = { id: string; fullName: string; login: string; role: "ADMIN" | "MANAGER"; universityId: string | null; isActive: boolean };

function StaffForm({ user, universities, isSelf, onDone }: { user?: StaffRow; universities: { id: string; name: string }[]; isSelf: boolean; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(async (prev: FormState, fd: FormData) => {
    const res = await saveStaffUserAction(prev, fd);
    if (res.ok) onDone();
    return res;
  });
  const [role, setRole] = React.useState<string>(user?.role ?? "MANAGER");
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {user && <input type="hidden" name="id" value={user.id} />}
      {state.message && !state.ok && <p className="text-sm font-medium text-error">{state.message}</p>}
      <Field label="F.I.Sh." htmlFor="u-name" error={e.fullName}>
        <Input id="u-name" name="fullName" defaultValue={user?.fullName} aria-invalid={!!e.fullName} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Login" htmlFor="u-login" error={e.login}>
          <Input id="u-login" name="login" defaultValue={user?.login} autoComplete="off" aria-invalid={!!e.login} />
        </Field>
        <Field label="Rol" htmlFor="u-role" error={e.role}>
          {isSelf ? (
            <>
              <input type="hidden" name="role" value="ADMIN" />
              <Input id="u-role" value="Administrator" disabled />
            </>
          ) : (
            <NativeSelect id="u-role" name="role" value={role} onChange={(ev) => setRole(ev.target.value)}>
              <option value="MANAGER">Universitet menejeri</option>
              <option value="ADMIN">Administrator</option>
            </NativeSelect>
          )}
        </Field>
      </div>
      {role === "MANAGER" && (
        <Field label="Universitet" htmlFor="u-uni" error={e.universityId} hint="Menejer faqat shu universitet talabalari va testlari bilan ishlaydi">
          <NativeSelect id="u-uni" name="universityId" defaultValue={user?.universityId ?? ""} aria-invalid={!!e.universityId}>
            <option value="" disabled>Universitetni tanlang</option>
            {universities.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </NativeSelect>
        </Field>
      )}
      <Field label={user ? "Yangi parol (ixtiyoriy)" : "Parol"} htmlFor="u-pass" error={e.password} hint={user ? "Bo'sh qoldirilsa, parol o'zgarmaydi" : "Kamida 8 ta belgi, harf va raqam bilan"}>
        <PasswordInput id="u-pass" name="password" autoComplete="new-password" aria-invalid={!!e.password} />
      </Field>
      {isSelf ? (
        <input type="hidden" name="isActive" value="on" />
      ) : (
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={user?.isActive ?? true} className="size-4 accent-[#315ECA]" />
          Hisob faol
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Bekor qilish</Button>
        <SubmitButton pending={pending} pendingText="Saqlanmoqda...">Saqlash</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function StaffDialog({ user, universities, isSelf = false, trigger }: { user?: StaffRow; universities: { id: string; name: string }[]; isSelf?: boolean; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}</DialogTitle>
          <DialogDescription>Menejer talabalarni yuklaydi, test yaratadi va test vaqtini ochadi. Administrator hamma narsani boshqaradi.</DialogDescription>
        </DialogHeader>
        {open && <StaffForm user={user} universities={universities} isSelf={isSelf} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
