"use client";

import { CheckCircle2 } from "lucide-react";
import { updateTestScheduleAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { useFormAction } from "@/components/forms/use-form-action";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { useT } from "@/i18n/client";

/** Test vaqti va bahosini tezkor o'zgartirish (test boshlangandan keyin ham). */
export function TestScheduleCard({
  testId,
  startsAt,
  endsAt,
  durationMinutes,
  maxScore,
  rawMax,
  questionsPerAttempt,
  totalQuestions,
  locked,
}: {
  testId: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: number;
  maxScore: number | null;
  rawMax: number;
  questionsPerAttempt: number | null;
  totalQuestions: number;
  locked: boolean;
}) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(updateTestScheduleAction.bind(null, testId));
  const e = state.errors ?? {};
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Vaqt, savollar soni va jami ball")}</CardTitle>
        <CardDescription>{t("Test boshlangan bo'lsa ham o'zgartirish mumkin")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-3">
          {state.ok && <Alert variant="success"><CheckCircle2 /><span>{t(state.message ?? "")}</span></Alert>}
          {state.message && !state.ok && <p className="text-sm font-medium text-error">{t(state.message)}</p>}
          <Field label={t("Boshlanish")} htmlFor="s-start" error={e.startsAt}>
            <Input id="s-start" name="startsAt" type="datetime-local" defaultValue={startsAt} />
          </Field>
          <Field label={t("Tugash")} htmlFor="s-end" error={e.endsAt}>
            <Input id="s-end" name="endsAt" type="datetime-local" defaultValue={endsAt} />
          </Field>
          <Field label={t("Davomiylik (daqiqa)")} htmlFor="s-dur" error={e.durationMinutes}>
            <Input id="s-dur" name="durationMinutes" type="number" min={1} max={600} defaultValue={durationMinutes} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Savollar soni")} htmlFor="s-qc" error={e.questionsPerAttempt}>
              <Input
                id="s-qc"
                name="questionsPerAttempt"
                type="number"
                min={1}
                max={1000}
                defaultValue={questionsPerAttempt ?? ""}
                placeholder={t("Hammasi ({n})", { n: totalQuestions })}
                readOnly={locked}
                title={locked ? t("Test boshlangan, o'zgartirib bo'lmaydi") : undefined}
              />
            </Field>
            <Field label={t("Jami ball")} htmlFor="s-max" error={e.maxScore}>
              <Input id="s-max" name="maxScore" type="number" min={1} max={1000} defaultValue={maxScore ?? ""} placeholder={String(rawMax)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Savollar soni: har bir talabaga testdagi {total} ta savoldan nechtasi tasodifiy tushadi (bo'sh — hammasi).", { total: totalQuestions })}{" "}
            {t("Jami ball bo'sh qolsa, savollar ballari yig'indisi ({rawMax}) olinadi; o'zgarsa, mavjud natijalar qayta hisoblanadi.", { rawMax })}
          </p>
          <SubmitButton pending={pending} pendingText={t("Saqlanmoqda...")}>{t("Saqlash")}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
