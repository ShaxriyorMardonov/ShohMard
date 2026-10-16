"use client";

import { useFormAction } from "@/components/forms/use-form-action";
import Link from "next/link";
import { saveTestAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

export type TestInitial = {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  durationMinutes: number;
  startsAt: string; // datetime-local qiymati
  endsAt: string;
  passingPercent: number;
  questionsPerAttempt: number | null;
  maxScore: number | null;
  locked?: boolean;
  resultRelease: "IMMEDIATE" | "AFTER_END" | "MANUAL";
  isPublished: boolean;
  universityIds: string[];
  questionCount: number;
};

export function TestForm({
  initial,
  universities,
  subjects = [],
  fixedUniversity,
}: {
  initial?: TestInitial;
  universities: { id: string; name: string }[];
  subjects?: string[];
  /** Menejer uchun: test faqat shu universitetga biriktiriladi. */
  fixedUniversity?: string;
}) {
  const { state, onSubmit, pending } = useFormAction(saveTestAction);
  const e = state.errors ?? {};
  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state.message && <Alert variant="error"><span>{state.message}</span></Alert>}
      <Card>
        <CardHeader><CardTitle>Asosiy ma&apos;lumotlar</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Test nomi" htmlFor="t-title" error={e.title}>
            <Input id="t-title" name="title" defaultValue={initial?.title} placeholder="Masalan: Oliy matematika — oraliq nazorat" aria-invalid={!!e.title} />
          </Field>
          <Field label="Fan" htmlFor="t-subject" error={e.subject}>
            <Input id="t-subject" name="subject" list="t-subjects" defaultValue={initial?.subject ?? ""} placeholder="Oliy matematika" autoComplete="off" />
            <datalist id="t-subjects">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
          </Field>
          <Field label="Tavsif va ko'rsatmalar" htmlFor="t-desc" error={e.description}>
            <Textarea id="t-desc" name="description" rows={3} defaultValue={initial?.description ?? ""} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Jadval va davomiylik</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Boshlanish (Toshkent vaqti)" htmlFor="t-start" error={e.startsAt}>
            <Input id="t-start" name="startsAt" type="datetime-local" defaultValue={initial?.startsAt} aria-invalid={!!e.startsAt} />
          </Field>
          <Field label="Tugash (Toshkent vaqti)" htmlFor="t-end" error={e.endsAt}>
            <Input id="t-end" name="endsAt" type="datetime-local" defaultValue={initial?.endsAt} aria-invalid={!!e.endsAt} />
          </Field>
          <Field label="Davomiylik (daqiqa)" htmlFor="t-dur" error={e.durationMinutes}>
            <Input id="t-dur" name="durationMinutes" type="number" min={1} max={600} defaultValue={initial?.durationMinutes ?? 60} aria-invalid={!!e.durationMinutes} />
          </Field>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Talaba testni oraliq ichida istalgan vaqtda boshlashi mumkin. Vaqt hisobi serverda yuritiladi va test oynasi yopilishidan oshmaydi.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Baholash va natijalar</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Har bir talabaga savollar soni"
            htmlFor="t-qcount"
            error={e.questionsPerAttempt}
            hint={initial?.locked ? "Test boshlangan, o'zgartirib bo'lmaydi" : "Bo'sh qolsa, testdagi barcha savollar beriladi. Aks holda har bir talabaga tasodifiy tanlanadi"}
          >
            <Input id="t-qcount" name="questionsPerAttempt" type="number" min={1} max={1000} placeholder="Hammasi" defaultValue={initial?.questionsPerAttempt ?? ""} readOnly={initial?.locked} aria-invalid={!!e.questionsPerAttempt} />
          </Field>
          <Field label="Maksimal ball (jami baho)" htmlFor="t-max" error={e.maxScore} hint="Bo'sh qolsa, savollar ballari yig'indisi. Masalan, 100 yoki 5">
            <Input id="t-max" name="maxScore" type="number" min={1} max={1000} placeholder="Savollar ballari yig'indisi" defaultValue={initial?.maxScore ?? ""} aria-invalid={!!e.maxScore} />
          </Field>
          <Field label="O'tish chegarasi (%)" htmlFor="t-pass" error={e.passingPercent}>
            <Input id="t-pass" name="passingPercent" type="number" min={0} max={100} defaultValue={initial?.passingPercent ?? 60} />
          </Field>
          <Field label="Natijalarni e'lon qilish" htmlFor="t-rel" error={e.resultRelease} hint="To'g'ri javoblar faqat natija e'lon qilingach ko'rsatiladi">
            <NativeSelect id="t-rel" name="resultRelease" defaultValue={initial?.resultRelease ?? "IMMEDIATE"}>
              <option value="IMMEDIATE">Topshirilgandan so&apos;ng darhol</option>
              <option value="AFTER_END">Test yakunlangach</option>
              <option value="MANUAL">Administrator e&apos;lon qilganda</option>
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

      {fixedUniversity ? (
        <p className="text-sm text-muted-foreground">Test <b className="text-midnight">{fixedUniversity}</b> talabalari uchun yaratiladi.</p>
      ) : (
      <Card>
        <CardHeader><CardTitle>Universitetlar</CardTitle></CardHeader>
        <CardContent className="grid gap-2">
          {e.universityIds && <p className="text-xs font-medium text-error">{e.universityIds}</p>}
          {universities.length === 0 && <p className="text-sm text-muted-foreground">Avval universitet qo&apos;shing.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {universities.map((u) => (
              <label key={u.id} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/50">
                <input type="checkbox" name="universityIds" value={u.id} defaultChecked={initial?.universityIds.includes(u.id)} className="size-4 accent-[#315ECA]" />
                {u.name}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardContent className="grid gap-2 pt-5">
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="isPublished" defaultChecked={initial?.isPublished} className="size-4 accent-[#315ECA]" />
            Faol (talabalarga ko&apos;rinadi)
          </label>
          {e.isPublished ? (
            <p className="text-xs font-medium text-error">{e.isPublished}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {initial ? `Testda ${initial.questionCount} ta savol bor.` : "Yangi testni saqlagach, savollar qo'shib, so'ng faollashtiring."}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline">
          <Link href={initial ? `/admin/tests/${initial.id}` : "/admin/tests"}>Bekor qilish</Link>
        </Button>
        <SubmitButton pending={pending} pendingText="Saqlanmoqda...">{initial ? "O'zgarishlarni saqlash" : "Testni yaratish"}</SubmitButton>
      </div>
    </form>
  );
}
