"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import { CheckCircle2 } from "lucide-react";
import { updateAdminProfileAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function AdminProfileForm({ fullName }: { fullName: string }) {
  const { state, onSubmit, pending } = useFormAction(updateAdminProfileAction);
  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-4">
      {state.ok && <Alert variant="success"><CheckCircle2 /><span>{state.message}</span></Alert>}
      <Field label="To'liq ism" htmlFor="a-name" error={state.errors?.fullName}>
        <Input id="a-name" name="fullName" defaultValue={fullName} />
      </Field>
      <div><SubmitButton pending={pending} pendingText="Saqlanmoqda...">Saqlash</SubmitButton></div>
    </form>
  );
}
