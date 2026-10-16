"use client";

import * as React from "react";
import { useFormAction } from "@/components/forms/use-form-action";
import { saveUniversityAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/validation";

type Uni = { id: string; name: string; shortName: string; city: string | null };

function UniversityForm({ university, onDone }: { university?: Uni; onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(async (prev: FormState, fd: FormData) => {
    const res = await saveUniversityAction(prev, fd);
    if (res.ok) onDone();
    return res;
  });
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {university && <input type="hidden" name="id" value={university.id} />}
      {state.message && !state.ok && <p className="text-sm font-medium text-error">{state.message}</p>}
      <Field label="To'liq nomi" htmlFor="u-name" error={e.name}>
        <Input id="u-name" name="name" defaultValue={university?.name} placeholder="Masalan: Toshkent davlat texnika universiteti" aria-invalid={!!e.name} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Qisqa nomi" htmlFor="u-short" error={e.shortName}>
          <Input id="u-short" name="shortName" defaultValue={university?.shortName} placeholder="TDTU" aria-invalid={!!e.shortName} />
        </Field>
        <Field label="Shahar" htmlFor="u-city" error={e.city}>
          <Input id="u-city" name="city" defaultValue={university?.city ?? ""} placeholder="Toshkent" />
        </Field>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Bekor qilish</Button>
        <SubmitButton pending={pending} pendingText="Saqlanmoqda...">Saqlash</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function UniversityDialog({ university, trigger }: { university?: Uni; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{university ? "Universitetni tahrirlash" : "Yangi universitet"}</DialogTitle>
          <DialogDescription>Talabalar va testlar universitetga biriktiriladi.</DialogDescription>
        </DialogHeader>
        {open && <UniversityForm university={university} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
