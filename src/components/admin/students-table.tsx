"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UsersRound } from "lucide-react";
import { assignStudentsGroupAction, deleteStudentAction } from "@/actions/admin";
import { Field } from "@/components/forms/field";
import { StudentDialog, type OrgNames, type StudentRow } from "@/components/admin/student-dialog";
import { UserActiveSwitch } from "@/components/admin/user-active-switch";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/i18n/client";
import { STUDY_FORMS, studyFormLabel } from "@/lib/labels";

export type StudentListRow = StudentRow & {
  university: { shortName: string } | null;
  lastLoginAt: string | null;
  attempts: number;
};

export function StudentsTable({
  rows,
  universities,
  orgNames,
  fixedUniversity,
  canDelete,
}: {
  rows: StudentListRow[];
  universities: { id: string; name: string }[];
  orgNames: OrgNames;
  fixedUniversity?: string;
  canDelete: boolean;
}) {
  const { t } = useT();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [assignOpen, setAssignOpen] = React.useState(false);
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const selectedRows = rows.filter((r) => selected.has(r.id));
  const uniOfSelection = new Set(selectedRows.map((r) => r.universityId));

  return (
    <>
      <div className="flex min-h-12 flex-wrap items-center gap-3 border-b px-4 py-2 text-sm">
        {selected.size ? (
          <>
            <span className="font-semibold text-midnight">{t("{n} ta tanlandi", { n: selected.size })}</span>
            <Button size="sm" onClick={() => setAssignOpen(true)} disabled={uniOfSelection.size !== 1}>
              <UsersRound /> {t("Guruhga biriktirish")}
            </Button>
            {uniOfSelection.size > 1 && <span className="text-xs text-muted-foreground">{t("Bitta universitet talabalarini tanlang")}</span>}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t("Bekor qilish")}</Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{t("Bir nechta talabani guruhga biriktirish uchun belgilang")}</span>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                aria-label={t("Hammasini tanlash")}
                checked={allChecked}
                onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
                className="size-4 accent-[#315ECA]"
              />
            </TableHead>
            <TableHead>{t("F.I.Sh.")}</TableHead>
            <TableHead>{t("Login")}</TableHead>
            <TableHead>{t("JShShIR")}</TableHead>
            {!fixedUniversity && <TableHead>{t("Universitet")}</TableHead>}
            <TableHead>{t("Fakultet")}</TableHead>
            <TableHead>{t("Guruh")}</TableHead>
            <TableHead>{t("Ta'lim shakli")}</TableHead>
            <TableHead>{t("Holat")}</TableHead>
            <TableHead className="text-right">{t("Amallar")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
              <TableCell>
                <input type="checkbox" aria-label={t("{name} ni tanlash", { name: s.fullName })} checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="size-4 accent-[#315ECA]" />
              </TableCell>
              <TableCell className="font-semibold text-midnight">{s.fullName}</TableCell>
              <TableCell className="font-mono text-xs">{s.login}</TableCell>
              <TableCell className="font-mono text-xs">{s.pinfl ?? "—"}</TableCell>
              {!fixedUniversity && <TableCell>{s.university?.shortName ?? "—"}</TableCell>}
              <TableCell className="max-w-[180px] text-xs">{s.faculty?.name ?? "—"}</TableCell>
              <TableCell>{s.group?.name ?? "—"}</TableCell>
              <TableCell className="text-xs">{t(studyFormLabel(s.studyForm))}</TableCell>
              <TableCell><UserActiveSwitch id={s.id} active={s.isActive} /></TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  <StudentDialog
                    student={s}
                    universities={universities}
                    orgNames={orgNames}
                    fixedUniversity={fixedUniversity}
                    trigger={<Button size="icon-sm" variant="ghost" aria-label={t("Tahrirlash")}><Pencil /></Button>}
                  />
                  {canDelete && (
                    <ConfirmAction
                      trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label={t("O'chirish")}><Trash2 /></Button>}
                      title={t("Talabani o'chirish")}
                      description={
                        s.attempts
                          ? t("{name} imtihon topshirgan. Natijalarni saqlash uchun hisobni nofaol qilish tavsiya etiladi.", { name: s.fullName })
                          : t("{name} hisobi butunlay o'chiriladi.", { name: s.fullName })
                      }
                      confirmLabel={t("O'chirish")}
                      action={deleteStudentAction.bind(null, s.id)}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <AssignDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        ids={[...selected]}
        names={orgNames[[...uniOfSelection][0] ?? ""] ?? { faculties: [], groups: [] }}
        onDone={() => setSelected(new Set())}
      />
    </>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  ids,
  names,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ids: string[];
  names: { faculties: string[]; groups: string[] };
  onDone: () => void;
}) {
  const { t } = useT();
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const listId = React.useId();
  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setError(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Guruhga biriktirish")}</DialogTitle>
          <DialogDescription>{t("{n} ta talaba uchun. Bo'sh qoldirilgan maydon o'zgarmaydi.", { n: ids.length })}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await assignStudentsGroupAction(ids, {
                facultyName: String(fd.get("facultyName") ?? ""),
                groupName: String(fd.get("groupName") ?? ""),
                studyForm: String(fd.get("studyForm") ?? ""),
              });
              if (res?.error) setError(res.error);
              else {
                onOpenChange(false);
                onDone();
                router.refresh();
              }
            });
          }}
        >
          {error && <p className="text-sm font-medium text-error">{t(error)}</p>}
          <Field label={t("Guruh")} htmlFor="a-group">
            <Input id="a-group" name="groupName" list={`${listId}-g`} placeholder="KI-21" autoComplete="off" />
            <datalist id={`${listId}-g`}>{names.groups.map((n) => <option key={n} value={n} />)}</datalist>
          </Field>
          <Field label={t("Fakultet")} htmlFor="a-fac">
            <Input id="a-fac" name="facultyName" list={`${listId}-f`} placeholder={t("Kompyuter injiniringi")} autoComplete="off" />
            <datalist id={`${listId}-f`}>{names.faculties.map((n) => <option key={n} value={n} />)}</datalist>
          </Field>
          <Field label={t("Ta'lim shakli")} htmlFor="a-form">
            <NativeSelect id="a-form" name="studyForm" defaultValue="">
              <option value="">{t("O'zgarmasin")}</option>
              {STUDY_FORMS.map((f) => <option key={f.value} value={f.value}>{t(f.label)}</option>)}
            </NativeSelect>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("Bekor qilish")}</Button>
            <Button type="submit" disabled={pending}>{pending ? t("Saqlanmoqda...") : t("Biriktirish")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
