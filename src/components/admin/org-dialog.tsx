"use client";

import * as React from "react";
import { saveFacultyAction, saveGroupAction } from "@/actions/admin";
import { useFormAction } from "@/components/forms/use-form-action";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/validation";

type Props = {
  kind: "faculty" | "group";
  universityId: string;
  item?: { id: string; name: string; facultyId?: string | null };
  faculties?: { id: string; name: string }[];
  defaultFacultyId?: string;
  trigger: React.ReactNode;
};

function OrgForm({ kind, universityId, item, faculties = [], defaultFacultyId, onDone }: Omit<Props, "trigger"> & { onDone: () => void }) {
  const { state, onSubmit, pending } = useFormAction(async (prev: FormState, fd: FormData) => {
    const res = await (kind === "faculty" ? saveFacultyAction : saveGroupAction)(prev, fd);
    if (res.ok) onDone();
    return res;
  });
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <input type="hidden" name="universityId" value={universityId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <Field label={kind === "faculty" ? "Fakultet nomi" : "Guruh nomi"} htmlFor="o-name" error={e.name}>
        <Input id="o-name" name="name" defaultValue={item?.name} placeholder={kind === "faculty" ? "Kompyuter injiniringi" : "KI-21"} autoFocus aria-invalid={!!e.name} />
      </Field>
      {kind === "group" && (
        <Field label="Fakultet" htmlFor="o-fac" error={e.facultyId}>
          <NativeSelect id="o-fac" name="facultyId" defaultValue={item?.facultyId ?? defaultFacultyId ?? ""}>
            <option value="">Fakultetsiz</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </NativeSelect>
        </Field>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>Bekor qilish</Button>
        <SubmitButton pending={pending} pendingText="Saqlanmoqda...">Saqlash</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function OrgDialog({ trigger, ...props }: Props) {
  const [open, setOpen] = React.useState(false);
  const title = `${props.kind === "faculty" ? "Fakultet" : "Guruh"}${props.item ? "ni tahrirlash" : " qo'shish"}`;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        {open && <OrgForm {...props} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
