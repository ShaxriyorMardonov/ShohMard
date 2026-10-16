"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import * as React from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { saveQuestionAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

type QType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE";
type Opt = { key: number; text: string; isCorrect: boolean };
export type QuestionInitial = {
  id: string;
  text: string;
  type: QType;
  subject: string | null;
  explanation: string | null;
  options: { text: string; isCorrect: boolean }[];
};

const TF: Opt[] = [
  { key: 1, text: "To'g'ri", isCorrect: true },
  { key: 2, text: "Noto'g'ri", isCorrect: false },
];

export function QuestionForm({ initial, locked }: { initial?: QuestionInitial; locked?: boolean }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(saveQuestionAction);
  const [type, setType] = React.useState<QType>(initial?.type ?? "SINGLE");
  const keyRef = React.useRef(100);
  const [options, setOptions] = React.useState<Opt[]>(() =>
    initial
      ? initial.options.map((o, i) => ({ key: i, ...o }))
      : [0, 1, 2, 3].map((k) => ({ key: k, text: "", isCorrect: k === 0 })),
  );
  const e = state.errors ?? {};

  const changeType = (next: QType) => {
    setType(next);
    if (next === "TRUE_FALSE") setOptions(TF.map((o) => ({ ...o })));
    else if (type === "TRUE_FALSE") setOptions([0, 1, 2, 3].map((k) => ({ key: ++keyRef.current, text: "", isCorrect: k === 0 })));
    else if (next === "SINGLE") {
      const first = options.findIndex((o) => o.isCorrect);
      setOptions(options.map((o, i) => ({ ...o, isCorrect: i === first })));
    }
  };
  const toggleCorrect = (key: number) => {
    setOptions((opts) =>
      opts.map((o) =>
        type === "MULTIPLE" ? (o.key === key ? { ...o, isCorrect: !o.isCorrect } : o) : { ...o, isCorrect: o.key === key },
      ),
    );
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="options" value={JSON.stringify(options.map(({ text, isCorrect }) => ({ text, isCorrect })))} />
      {locked && (
        <Alert variant="warning">
          <span>{t("Bu savol boshlangan imtihonlarda ishlatilgan. Natijalar buzilmasligi uchun uni tahrirlab bo'lmaydi.")}</span>
        </Alert>
      )}
      {state.message && <Alert variant="error"><span>{t(state.message)}</span></Alert>}
      <Card>
        <CardContent className="grid gap-4 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("Savol turi")} htmlFor="q-type" error={e.type}>
              <NativeSelect id="q-type" name="type" value={type} onChange={(ev) => changeType(ev.target.value as QType)} disabled={locked}>
                <option value="SINGLE">{t("Bitta javobli")}</option>
                <option value="MULTIPLE">{t("Ko'p javobli")}</option>
                <option value="TRUE_FALSE">{t("To'g'ri / Noto'g'ri")}</option>
              </NativeSelect>
            </Field>
            <Field label={t("Fan / mavzu")} htmlFor="q-subject" error={e.subject}>
              <Input id="q-subject" name="subject" defaultValue={initial?.subject ?? ""} placeholder={t("Masalan: Matematika")} disabled={locked} />
            </Field>
          </div>
          <Field label={t("Savol matni")} htmlFor="q-text" error={e.text}>
            <Textarea id="q-text" name="text" rows={4} defaultValue={initial?.text} aria-invalid={!!e.text} disabled={locked} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-midnight">{t("Javob variantlari")}</p>
              <p className="text-xs text-muted-foreground">
                {type === "MULTIPLE" ? t("Bir yoki bir nechta to'g'ri javobni belgilang") : t("Bitta to'g'ri javobni belgilang")}
              </p>
            </div>
            {type !== "TRUE_FALSE" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={locked || options.length >= 10}
                onClick={() => setOptions((o) => [...o, { key: ++keyRef.current, text: "", isCorrect: false }])}
              >
                <Plus /> {t("Variant")}
              </Button>
            )}
          </div>
          {e.options && <p className="text-xs font-medium text-error">{t(e.options)}</p>}
          {options.map((o, i) => (
            <div key={o.key} className={cn("flex items-center gap-3 rounded-lg border p-2 pl-3", o.isCorrect ? "border-success/50 bg-success/5" : "border-border")}>
              <input
                type={type === "MULTIPLE" ? "checkbox" : "radio"}
                name="correct-ui"
                checked={o.isCorrect}
                onChange={() => toggleCorrect(o.key)}
                className="size-4 accent-[#21A67A]"
                aria-label={t("{n}-variant to'g'ri", { n: i + 1 })}
                disabled={locked}
              />
              <Input
                value={o.text}
                onChange={(ev) => setOptions((opts) => opts.map((x) => (x.key === o.key ? { ...x, text: ev.target.value } : x)))}
                placeholder={t("{n}-variant", { n: i + 1 })}
                readOnly={type === "TRUE_FALSE"}
                disabled={locked}
                aria-invalid={!!e[`options.${i}.text`]}
                className="border-0 shadow-none focus-visible:ring-0"
              />
              {type !== "TRUE_FALSE" && options.length > 2 && (
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label={t("Variantni o'chirish")}
                  disabled={locked}
                  onClick={() => setOptions((opts) => opts.filter((x) => x.key !== o.key))}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <Field label={t("Izoh (natija e'lon qilingach talabaga ko'rsatiladi)")} htmlFor="q-exp" error={e.explanation}>
            <Textarea id="q-exp" name="explanation" rows={2} defaultValue={initial?.explanation ?? ""} disabled={locked} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href="/admin/questions">{t("Bekor qilish")}</Link>
        </Button>
        <SubmitButton pending={pending} disabled={locked} pendingText={t("Saqlanmoqda...")}>{t("Savolni saqlash")}</SubmitButton>
      </div>
    </form>
  );
}
