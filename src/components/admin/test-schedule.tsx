"use client";

import { CheckCircle2 } from "lucide-react";
import { updateTestScheduleAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

/** Test vaqti va bahosini tezkor o'zgartirish (test boshlangandan keyin ham). */
export function TestScheduleCard({
  testId,
  startsAt,
  endsAt,
  durationMinutes,
  maxScore,
  rawMax,
}: {
  testId: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  maxScore: number | null;
  rawMax: number;
}) {
  const { state, onSubmit, pending } = useFormAction(updateTestScheduleAction.bind(null, testId));
  const e = state.errors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vaqt va baho</CardTitle>
        <CardDescription>Test boshlangan bo&apos;lsa ham o&apos;zgartirish mumkin</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          {state.ok && <Alert variant="success"><CheckCircle2 /><span>{state.message}</span></Alert>}
          {state.message && !state.ok && <p className="text-sm font-medium text-error">{state.message}</p>}
          <Field label="Boshlanish" htmlFor="s-start" error={e.startsAt}>
            <Input id="s-start" name="startsAt" type="datetime-local" defaultValue={startsAt} />
          </Field>
          <Field label="Tugash" htmlFor="s-end" error={e.endsAt}>
            <Input id="s-end" name="endsAt" type="datetime-local" defaultValue={endsAt} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Davomiylik (daq.)" htmlFor="s-dur" error={e.durationMinutes}>
              <Input id="s-dur" name="durationMinutes" type="number" min={1} max={600} defaultValue={durationMinutes} />
            </Field>
            <Field label="Jami baho" htmlFor="s-max" error={e.maxScore}>
              <Input id="s-max" name="maxScore" type="number" min={1} max={1000} defaultValue={maxScore ?? ""} placeholder={String(rawMax)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            Jami baho bo&apos;sh qolsa, savollar ballari yig&apos;indisi ({rawMax}) olinadi. Baho o&apos;zgarsa, mavjud natijalar ham qayta hisoblanadi.
          </p>
          <SubmitButton pending={pending} pendingText="Saqlanmoqda...">Saqlash</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
