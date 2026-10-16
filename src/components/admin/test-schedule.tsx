"use client";

import * as React from "react";
import { LiveStudentsAlert, type Live } from "@/components/admin/live-warning";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import { liveAttemptsAction, updateTestScheduleAction } from "@/actions/admin";
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
  maxAttempts,
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
  maxAttempts: number;
  totalQuestions: number;
  locked: boolean;
}) {
  const { t } = useT();
  const { state, submit, pending } = useFormAction(updateTestScheduleAction.bind(null, testId));
  const [confirm, setConfirm] = React.useState<{ fd: FormData; live: Live } | null>(null);
  const [checking, setChecking] = React.useState(false);
  // Vaqt o'zgarsa va hozir test ishlayotganlar bo'lsa, avval ogohlantiramiz
  const onSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const timeChanged =
      fd.get("startsAt") !== startsAt || fd.get("endsAt") !== endsAt || Number(fd.get("durationMinutes")) !== durationMinutes;
    if (timeChanged) {
      setChecking(true);
      try {
        const live = await liveAttemptsAction(testId);
        if (live.count) return setConfirm({ fd, live });
      } finally {
        setChecking(false);
      }
    }
    submit(fd);
  };
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
            <Field label={t("Urinishlar soni")} htmlFor="s-att" error={e.maxAttempts}>
              <Input id="s-att" name="maxAttempts" type="number" min={1} max={20} defaultValue={maxAttempts} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Savollar soni: har bir talabaga testdagi {total} ta savoldan nechtasi tasodifiy tushadi (bo'sh — hammasi).", { total: totalQuestions })}{" "}
            {t("Jami ball bo'sh qolsa, savollar ballari yig'indisi ({rawMax}) olinadi; o'zgarsa, mavjud natijalar qayta hisoblanadi.", { rawMax })}{" "}
            {t("Urinishlar soni: talaba testni necha marta topshira oladi.")}
          </p>
          <SubmitButton pending={pending || checking} pendingText={t("Saqlanmoqda...")}>{t("Saqlash")}</SubmitButton>
        </form>
        <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("Test vaqtini o'zgartirish")}</DialogTitle>
              <DialogDescription>{t("Yangi vaqt testni hozir ishlayotgan talabalarga ham darhol qo'llanadi.")}</DialogDescription>
            </DialogHeader>
            {confirm && (
              <LiveStudentsAlert
                live={confirm.live}
                note={t("Ularning taymeri yangi vaqtga moslanadi va ekranida ogohlantirish chiqadi. Agar vaqt qisqarib, tugab qolsa, javoblari avtomatik topshiriladi.")}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirm(null)}>{t("Bekor qilish")}</Button>
              <Button
                onClick={() => {
                  if (confirm) submit(confirm.fd);
                  setConfirm(null);
                }}
              >
                {t("Baribir o'zgartirish")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
