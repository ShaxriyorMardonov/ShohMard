"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTestsAction, setTestActiveAction } from "@/actions/admin";
import { TEST_STATE_BADGE } from "@/components/admin/test-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TestState } from "@/lib/exam-rules";

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
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={active ? "Nofaol qilish" : "Faollashtirish"}
        disabled={pending || disabled}
        onClick={() =>
          start(async () => {
            const r = await setTestActiveAction(id, !active);
            setError(r?.error ?? null);
            router.refresh();
          })
        }
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${active ? "bg-success" : "bg-muted-foreground/30"}`}
      >
        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-5.5" : "translate-x-0.5"}`} />
      </button>
      {error && <p className="mt-1 max-w-[180px] text-[11px] leading-tight text-error">{error}</p>}
    </div>
  );
}

export function TestsTable({ groups, canDelete }: { groups: { subject: string; rows: TestListRow[] }[]; canDelete: boolean }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirm, setConfirm] = React.useState(false);
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
        <div className="sticky top-16 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-2 text-sm shadow-[var(--shadow-card)]">
          <span className="font-semibold text-midnight">{selected.size} ta test tanlandi</span>
          <Button size="sm" variant="destructive" onClick={() => setConfirm(true)}><Trash2 /> O&apos;chirish</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Bekor qilish</Button>
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
                <Table className="min-w-[860px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      {canDelete && (
                        <TableHead className="w-10">
                          <input type="checkbox" aria-label={`${g.subject}: hammasini tanlash`} checked={allOn} onChange={() => toggle(ids, !allOn)} className="size-4 accent-[#315ECA]" />
                        </TableHead>
                      )}
                      <TableHead className="w-[28%]">Test</TableHead>
                      <TableHead className="w-20">Faol</TableHead>
                      <TableHead className="w-36">Holat</TableHead>
                      <TableHead className="w-48">Vaqt oralig&apos;i</TableHead>
                      <TableHead className="w-24">Savollar</TableHead>
                      <TableHead className="w-28">Topshirgan</TableHead>
                      <TableHead>Universitetlar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.rows.map((t) => {
                      const st = TEST_STATE_BADGE[t.state];
                      return (
                        <TableRow key={t.id} data-state={selected.has(t.id) ? "selected" : undefined}>
                          {canDelete && (
                            <TableCell>
                              <input type="checkbox" aria-label={`${t.title} ni tanlash`} checked={selected.has(t.id)} onChange={() => toggle([t.id], !selected.has(t.id))} className="size-4 accent-[#315ECA]" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Link href={`/admin/tests/${t.id}`} className="font-semibold text-midnight hover:text-royal">{t.title}</Link>
                            <span className="block text-xs text-muted-foreground">{t.duration}</span>
                          </TableCell>
                          <TableCell><ActiveSwitch id={t.id} active={t.isPublished} /></TableCell>
                          <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{t.startsAt}<br />{t.endsAt}</TableCell>
                          <TableCell>{t.questions}</TableCell>
                          <TableCell>{t.attempts}</TableCell>
                          <TableCell className="text-xs">{t.universities || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            </section>
          );
        })}
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Testlarni o&apos;chirish</DialogTitle>
            <DialogDescription>
              {chosen.length} ta test butunlay o&apos;chiriladi.
              {attempts > 0 && ` Ular bilan birga ${attempts} ta talaba natijasi ham o'chadi va qayta tiklanmaydi.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>Bekor qilish</Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await deleteTestsAction([...selected]);
                  setSelected(new Set());
                  setConfirm(false);
                  router.refresh();
                })
              }
            >
              {pending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
