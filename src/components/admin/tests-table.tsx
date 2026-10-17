"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTestsAction, setTestActiveAction } from "@/actions/admin";
import { ReauthField } from "@/components/admin/reauth-field";
import { TEST_STATE_BADGE } from "@/components/admin/test-state";
import { Badge } from "@/components/ui/badge";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TestState } from "@/lib/exam-rules";
import { useT } from "@/i18n/client";

export type TestListRow = {
  id: string;
  title: string;
  subject: string | null;
  state: TestState;
  isPublished: boolean;
  startsAt: string;
  endsAt: string;
  duration: string;
  questions: number;
  attempts: number;
  universities: string;
};

/** Faol/nofaol almashtirgich. */
export function ActiveSwitch({ id, active, disabled }: { id: string; active: boolean; disabled?: boolean }) {
  return <ToggleSwitch active={active} disabled={disabled} onToggle={(next) => setTestActiveAction(id, next)} />;
}

export function TestsTable({ groups, canDelete }: { groups: { subject: string; rows: TestListRow[] }[]; canDelete: boolean }) {
  const { t } = useT();
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirm, setConfirm] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const all = groups.flatMap((g) => g.rows);
  const chosen = all.filter((r) => selected.has(r.id));
  const attempts = chosen.reduce((n, r) => n + r.attempts, 0);
  const toggle = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });

  return (
    <>
      {canDelete && selected.size > 0 && (
        <div className="sticky top-14 z-20 sm:top-16 mb-3 flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-2 text-sm shadow-[var(--shadow-card)]">
          <span className="font-semibold text-midnight">{t("{n} ta test tanlandi", { n: selected.size })}</span>
          <Button size="sm" variant="destructive" onClick={() => setConfirm(true)}><Trash2 /> {t("O'chirish")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t("Bekor qilish")}</Button>
        </div>
      )}
      <div className="grid gap-6">
        {groups.map((g) => {
          const ids = g.rows.map((r) => r.id);
          const allOn = ids.every((id) => selected.has(id));
          return (
            <section key={g.subject}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {g.subject}
                <Badge variant="muted">{g.rows.length}</Badge>
              </h2>
              <Card className="overflow-hidden">
                {/* Telefon: har bir test kartochka ko'rinishida */}
                <ul className="divide-y md:hidden">
                  {g.rows.map((row) => {
                    const st = TEST_STATE_BADGE[row.state];
                    return (
                      <li key={row.id} className="flex gap-3 px-4 py-3">
                        {canDelete && (
                          <input type="checkbox" aria-label={t("{title} ni tanlash", { title: row.title })} checked={selected.has(row.id)} onChange={() => toggle([row.id], !selected.has(row.id))} className="mt-1 size-4 shrink-0 accent-[#315ECA]" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/admin/tests/${row.id}`} className="font-semibold leading-snug text-midnight hover:text-royal">{row.title}</Link>
                            <ActiveSwitch id={row.id} active={row.isPublished} />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <Badge variant={st.variant}>{t(st.label)}</Badge>
                            <span>{row.duration}</span>
                            <span>{t("Savollar")}: {row.questions}</span>
                            <span>{t("Topshirgan")}: {row.attempts}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{row.startsAt} — {row.endsAt}</p>
                          {row.universities && <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.universities}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="hidden md:block">
                <Table className="min-w-[860px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      {canDelete && (
                        <TableHead className="w-10">
                          <input type="checkbox" aria-label={t("{subject}: hammasini tanlash", { subject: g.subject })} checked={allOn} onChange={() => toggle(ids, !allOn)} className="size-4 accent-[#315ECA]" />
                        </TableHead>
                      )}
                      <TableHead className="w-[28%]">{t("Test")}</TableHead>
                      <TableHead className="w-36">{t("Holat")}</TableHead>
                      <TableHead className="w-48">{t("Vaqt oralig'i")}</TableHead>
                      <TableHead className="w-24">{t("Savollar")}</TableHead>
                      <TableHead className="w-28">{t("Topshirgan")}</TableHead>
                      <TableHead>{t("Universitetlar")}</TableHead>
                      <TableHead className="w-20">{t("Faol")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.rows.map((row) => {
                      const st = TEST_STATE_BADGE[row.state];
                      return (
                        <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                          {canDelete && (
                            <TableCell>
                              <input type="checkbox" aria-label={t("{title} ni tanlash", { title: row.title })} checked={selected.has(row.id)} onChange={() => toggle([row.id], !selected.has(row.id))} className="size-4 accent-[#315ECA]" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Link href={`/admin/tests/${row.id}`} className="font-semibold text-midnight hover:text-royal">{row.title}</Link>
                            <span className="block text-xs text-muted-foreground">{row.duration}</span>
                          </TableCell>
                          <TableCell><Badge variant={st.variant}>{t(st.label)}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{row.startsAt}<br />{row.endsAt}</TableCell>
                          <TableCell>{row.questions}</TableCell>
                          <TableCell>{row.attempts}</TableCell>
                          <TableCell className="text-xs">{row.universities || "—"}</TableCell>
                          <TableCell><ActiveSwitch id={row.id} active={row.isPublished} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </Card>
            </section>
          );
        })}
      </div>
      <Dialog open={confirm} onOpenChange={(o) => { setConfirm(o); setPassword(""); setError(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Testlarni o'chirish")}</DialogTitle>
            <DialogDescription>
              {t("{n} ta test butunlay o'chiriladi.", { n: chosen.length })}
              {attempts > 0 && ` ${t("Ular bilan birga {n} ta talaba natijasi ham o'chadi va qayta tiklanmaydi.", { n: attempts })}`}
            </DialogDescription>
          </DialogHeader>
          <ReauthField value={password} onChange={setPassword} error={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>{t("Bekor qilish")}</Button>
            <Button
              variant="destructive"
              disabled={pending || !password}
              onClick={() =>
                start(async () => {
                  const r = await deleteTestsAction([...selected], password);
                  if (r?.error) return setError(r.error);
                  setSelected(new Set());
                  setConfirm(false);
                  router.refresh();
                })
              }
            >
              {pending ? t("O'chirilmoqda...") : t("O'chirish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
