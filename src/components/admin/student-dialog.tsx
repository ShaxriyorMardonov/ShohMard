"use client";

import * as React from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { saveStudentAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/validation";

type Student = { id: string; fullName: string; login: string; universityId: string | null; groupName: string | null; isActive: boolean };
type Uni = { id: string; name: string };

function StudentForm({ student, universities, onDone }: { student?: Student; universities: Uni[]; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(async (prev: FormState, fd: FormData) => {
    const res = await saveStudentAction(prev, fd);
    if (res.ok) onDone();
    return res;
  });
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {student && <input type="hidden" name="id" value={student.id} />}
      {state.message && !state.ok && <p className="text-sm font-medium text-error">{state.message}</p>}
      <Field label="F.I.Sh." htmlFor="s-name" error={e.fullName}>
        <Input id="s-name" name="fullName" defaultValue={student?.fullName} placeholder="Familiya Ism Sharif" aria-invalid={!!e.fullName} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Login" htmlFor="s-login" error={e.login}>
          <Input id="s-login" name="login" defaultValue={student?.login} placeholder="ali.valiyev" autoComplete="off" aria-invalid={!!e.login} />
        </Field>
        <Field label="Guruh" htmlFor="s-group" error={e.groupName}>
          <Input id="s-group" name="groupName" defaultValue={student?.groupName ?? ""} placeholder="KI-21" />
        </Field>
      </div>
      <Field label="Universitet" htmlFor="s-uni" error={e.universityId}>
        <NativeSelect id="s-uni" name="universityId" defaultValue={student?.universityId ?? ""} aria-invalid={!!e.universityId}>
          <option value="" disabled>Universitetni tanlang</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field
        label={student ? "Yangi parol (ixtiyoriy)" : "Parol"}
        htmlFor="s-pass"
        error={e.password}
        hint={student ? "Bo'sh qoldirilsa, parol o'zgarmaydi" : "Kamida 8 ta belgi, harf va raqam bilan"}
      >
        <PasswordInput id="s-pass" name="password" autoComplete="new-password" aria-invalid={!!e.password} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={student?.isActive ?? true} className="size-4 accent-[#315ECA]" />
        Hisob faol
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Bekor qilish</Button>
        <SubmitButton pending={pending} pendingText="Saqlanmoqda...">Saqlash</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function StudentDialog({ student, universities, trigger }: { student?: Student; universities: Uni[]; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? "Talabani tahrirlash" : "Yangi talaba"}</DialogTitle>
          <DialogDescription>Talaba faqat o&apos;z universitetiga belgilangan testlarni ko&apos;radi.</DialogDescription>
        </DialogHeader>
        {open && <StudentForm student={student} universities={universities} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
