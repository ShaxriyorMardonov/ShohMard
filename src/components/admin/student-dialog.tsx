"use client";

import * as React from "react";
import type { StudyForm } from "@prisma/client";
import { useFormAction } from "@/components/forms/use-form-action";
import { saveStudentAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SubmitButton } from "@/components/ui/submit-button";
import { STUDY_FORMS } from "@/lib/labels";
import { useT } from "@/i18n/client";
import type { FormState } from "@/lib/validation";

export type StudentRow = {
  id: string;
  fullName: string;
  login: string;
  universityId: string | null;
  faculty: { name: string } | null;
  group: { name: string } | null;
  studyForm: StudyForm | null;
  isActive: boolean;
};
type Uni = { id: string; name: string };
/** Universitet bo'yicha mavjud fakultet va guruh nomlari (taklif sifatida ko'rsatiladi). */
export type OrgNames = Record<string, { faculties: string[]; groups: string[] }>;

function StudentForm({
  student,
  universities,
  orgNames,
  fixedUniversity,
  onDone,
}: {
  student?: StudentRow;
  universities: Uni[];
  orgNames: OrgNames;
  fixedUniversity?: string;
  onDone: () => void;
}) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction(async (prev: FormState, fd: FormData) => {
    const res = await saveStudentAction(prev, fd);
    if (res.ok) onDone();
    return res;
  });
  const [uni, setUni] = React.useState(fixedUniversity ?? student?.universityId ?? "");
  const names = orgNames[uni] ?? { faculties: [], groups: [] };
  const e = state.errors ?? {};
  const listId = React.useId();
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {student && <input type="hidden" name="id" value={student.id} />}
      {state.message && !state.ok && <p className="text-sm font-medium text-error">{t(state.message)}</p>}
      <Field label={t("F.I.Sh.")} htmlFor="s-name" error={e.fullName}>
        <Input id="s-name" name="fullName" defaultValue={student?.fullName} placeholder={t("Familiya Ism Sharif")} aria-invalid={!!e.fullName} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Login")} htmlFor="s-login" error={e.login}>
          <Input id="s-login" name="login" defaultValue={student?.login} placeholder="ali.valiyev" autoComplete="off" aria-invalid={!!e.login} />
        </Field>
        <Field label={t("Ta'lim shakli")} htmlFor="s-form" error={e.studyForm}>
          <NativeSelect id="s-form" name="studyForm" defaultValue={student?.studyForm ?? ""}>
            <option value="">{t("Ko'rsatilmagan")}</option>
            {STUDY_FORMS.map((f) => (
              <option key={f.value} value={f.value}>{t(f.label)}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>
      {!fixedUniversity && (
        <Field label={t("Universitet")} htmlFor="s-uni" error={e.universityId}>
          <NativeSelect id="s-uni" name="universityId" value={uni} onChange={(ev) => setUni(ev.target.value)} aria-invalid={!!e.universityId}>
            <option value="" disabled>{t("Universitetni tanlang")}</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </NativeSelect>
        </Field>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Fakultet")} htmlFor="s-fac" error={e.facultyName} hint={t("Ro'yxatdan tanlang yoki yangisini yozing")}>
          <Input id="s-fac" name="facultyName" list={`${listId}-f`} defaultValue={student?.faculty?.name ?? ""} placeholder={t("Kompyuter injiniringi")} autoComplete="off" />
          <datalist id={`${listId}-f`}>{names.faculties.map((n) => <option key={n} value={n} />)}</datalist>
        </Field>
        <Field label={t("Guruh")} htmlFor="s-group" error={e.groupName}>
          <Input id="s-group" name="groupName" list={`${listId}-g`} defaultValue={student?.group?.name ?? ""} placeholder="KI-21" autoComplete="off" />
          <datalist id={`${listId}-g`}>{names.groups.map((n) => <option key={n} value={n} />)}</datalist>
        </Field>
      </div>
      {/* Menejer mavjud talabaning parolini o'zgartira olmaydi */}
      {!(student && fixedUniversity) && (
        <Field
          label={student ? t("Yangi parol (ixtiyoriy)") : t("Parol")}
          htmlFor="s-pass"
          error={e.password}
          hint={student ? t("Bo'sh qoldirilsa, parol o'zgarmaydi") : t("Kamida 8 ta belgi, harf va raqam bilan")}
        >
          <PasswordInput id="s-pass" name="password" autoComplete="new-password" aria-invalid={!!e.password} />
        </Field>
      )}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="isActive" defaultChecked={student?.isActive ?? true} className="size-4 accent-[#315ECA]" />
        {t("Hisob faol")}
      </label>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>{t("Bekor qilish")}</Button>
        <SubmitButton pending={pending} pendingText={t("Saqlanmoqda...")}>{t("Saqlash")}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

export function StudentDialog({
  student,
  universities,
  orgNames,
  fixedUniversity,
  trigger,
}: {
  student?: StudentRow;
  universities: Uni[];
  orgNames: OrgNames;
  fixedUniversity?: string;
  trigger: React.ReactNode;
}) {
  const { t } = useT();
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? t("Talabani tahrirlash") : t("Yangi talaba")}</DialogTitle>
          <DialogDescription>{t("Talaba faqat o'z universitetiga belgilangan testlarni ko'radi.")}</DialogDescription>
        </DialogHeader>
        {open && (
          <StudentForm student={student} universities={universities} orgNames={orgNames} fixedUniversity={fixedUniversity} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
