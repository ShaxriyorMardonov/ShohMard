"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteResultsAction } from "@/actions/admin";
import { ReauthField } from "@/components/admin/reauth-field";
import { GradeBadge } from "@/components/grade-badge";
import { SuspicionBadge, type ExamFlags } from "@/components/suspicion-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useT } from "@/i18n/client";
import type { TestKind } from "@prisma/client";

export type ResultRow = {
  id: string;
  fullName: string;
  login: string;
  university: string;
  org: string;
  testTitle: string;
  subject: string | null;
  attemptNo: number;
  submitted: string;
  auto: boolean;
  score: string;
  percent: number | null;
  passed: boolean;
  flags: ExamFlags;
  kind?: TestKind;
};

export function ResultsTable({ rows }: { rows: ResultRow[] }) {
  const { t } = useT();
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirm, setConfirm] = React.useState<string[] | null>(null);
  const [pending, start] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState("");
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/40 px-4 py-2.5 text-sm">
          <span className="font-semibold text-midnight">{t("{n} ta natija tanlandi", { n: selected.size })}</span>
          <Button size="sm" variant="destructive" onClick={() => setConfirm([...selected])}>
            <Trash2 /> {t("O'chirish")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t("Bekor qilish")}</Button>
        </div>
      )}
      {/* Telefon: har bir natija kartochka ko'rinishida */}
      <div className="md:hidden">
        <label className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))}
            className="size-4 accent-[#315ECA]"
          />
          {t("Hammasini tanlash")}
        </label>
        <ul className="divide-y">
          {rows.map((r) => (
            <li key={r.id} className="flex gap-3 px-4 py-3">
              <input type="checkbox" aria-label={t("{name} ni tanlash", { name: r.fullName })} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="mt-1 size-4 shrink-0 accent-[#315ECA]" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/admin/results/${r.id}`} className="font-semibold leading-snug text-midnight hover:text-royal">{r.fullName}</Link>
                  <Button size="icon-sm" variant="ghost" className="-mr-2 -mt-1 shrink-0 text-error hover:bg-error/10" aria-label={t("Natijani o'chirish")} onClick={() => setConfirm([r.id])}>
                    <Trash2 />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{[r.university, r.org].filter(Boolean).join(" · ")}</p>
                <p className="mt-1 text-sm text-midnight">
                  {r.testTitle}
                  {r.attemptNo > 1 && <span className="text-xs text-muted-foreground"> · {t("{n}-urinish", { n: r.attemptNo })}</span>}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant={r.passed ? "success" : "error"}>{r.percent}%</Badge>
                  <GradeBadge percent={r.percent} kind={r.kind} />
                  <SuspicionBadge flags={r.flags} />
                  <span>{r.score}</span>
                  <span>{r.submitted}{r.auto && ` · ${t("avtomatik")}`}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="hidden md:block">
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
            <TableHead>{t("Talaba")}</TableHead>
            <TableHead>{t("Universitet / guruh")}</TableHead>
            <TableHead>{t("Test")}</TableHead>
            <TableHead>{t("Topshirilgan")}</TableHead>
            <TableHead>{t("Ball")}</TableHead>
            <TableHead>{t("Natija")}</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
              <TableCell>
                <input type="checkbox" aria-label={t("{name} ni tanlash", { name: r.fullName })} checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="size-4 accent-[#315ECA]" />
              </TableCell>
              <TableCell>
                <Link href={`/admin/results/${r.id}`} className="font-semibold text-midnight hover:text-royal">{r.fullName}</Link>
                <span className="block font-mono text-xs text-muted-foreground">{r.login}</span>
              </TableCell>
              <TableCell>
                {r.university}
                <span className="block text-xs text-muted-foreground">{r.org}</span>
              </TableCell>
              <TableCell className="max-w-[240px]">
                <span className="line-clamp-2">{r.testTitle}</span>
                <span className="block text-xs text-muted-foreground">
                  {[r.subject, r.attemptNo > 1 ? t("{n}-urinish", { n: r.attemptNo }) : null].filter(Boolean).join(" · ")}
                </span>
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {r.submitted}
                {r.auto && <span className="block text-xs">{t("avtomatik")}</span>}
              </TableCell>
              <TableCell className="whitespace-nowrap">{r.score}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={r.passed ? "success" : "error"}>{r.percent}%</Badge>
                  <GradeBadge percent={r.percent} kind={r.kind} />
                  <SuspicionBadge flags={r.flags} />
                </div>
              </TableCell>
              <TableCell>
                <Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label={t("Natijani o'chirish")} onClick={() => setConfirm([r.id])}>
                  <Trash2 />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      <Dialog open={!!confirm} onOpenChange={(o) => { if (!o) { setConfirm(null); setError(null); setPassword(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Natijalarni o'chirish")}</DialogTitle>
            <DialogDescription>
              {t("{n} ta natija butunlay o'chiriladi. Talaba testni qayta topshirishi mumkin bo'ladi.", { n: confirm?.length ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <ReauthField value={password} onChange={setPassword} error={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>{t("Bekor qilish")}</Button>
            <Button
              variant="destructive"
              disabled={pending || !password}
              onClick={() =>
                start(async () => {
                  const r = await deleteResultsAction(confirm ?? [], password);
                  if (r?.error) return setError(r.error);
                  setSelected(new Set());
                  setConfirm(null);
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
