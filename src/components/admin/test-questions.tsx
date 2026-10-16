"use client";

import * as React from "react";
import { useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { addQuestionsToTestAction, removeQuestionFromTestAction, updateTestQuestionAction } from "@/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Q = { id: string; text: string; subject: string | null; typeLabel: string };
type Item = Q & { points: number };

export function TestQuestions({ testId, items, bank, locked }: { testId: string; items: Item[]; bank: Q[]; locked: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string } | void>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res?.error) setError(res.error);
    });
  const total = items.reduce((s, i) => s + i.points, 0);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length} ta savol · jami {total} ball {pending && <Loader2 className="ml-1 inline size-3.5 animate-spin" />}
        </p>
        {!locked && <AddQuestionsDialog testId={testId} bank={bank.filter((b) => !items.some((i) => i.id === b.id))} />}
      </div>
      {error && <p className="text-sm font-medium text-error">{error}</p>}
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Testga hali savol qo&apos;shilmagan.</p>
      ) : (
        <ol className="divide-y divide-border rounded-lg border">
          {items.map((q, i) => (
            <li key={q.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-royal">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-midnight">{q.text}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge variant="muted">{q.typeLabel}</Badge>
                  {q.subject && <Badge variant="default">{q.subject}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  Ball
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={q.points}
                    disabled={locked}
                    className="h-8 w-16"
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== q.points) run(() => updateTestQuestionAction(testId, q.id, { points: v }));
                    }}
                  />
                </label>
                <Button size="icon-sm" variant="ghost" aria-label="Yuqoriga" disabled={locked || i === 0 || pending} onClick={() => run(() => updateTestQuestionAction(testId, q.id, { move: "up" }))}>
                  <ArrowUp />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Pastga" disabled={locked || i === items.length - 1 || pending} onClick={() => run(() => updateTestQuestionAction(testId, q.id, { move: "down" }))}>
                  <ArrowDown />
                </Button>
                <Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label="Testdan olib tashlash" disabled={locked || pending} onClick={() => run(() => removeQuestionFromTestAction(testId, q.id))}>
                  <Trash2 />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AddQuestionsDialog({ testId, bank }: { testId: string; bank: Q[] }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const filtered = bank.filter((q) => {
    const s = query.trim().toLowerCase();
    return !s || q.text.toLowerCase().includes(s) || (q.subject ?? "").toLowerCase().includes(s);
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setSelected(new Set());
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm"><Plus /> Savollar qo&apos;shish</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Savollar bankidan qo&apos;shish</DialogTitle>
          <DialogDescription>Testga qo&apos;shiladigan savollarni belgilang.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Matn yoki fan bo'yicha qidirish" className="pl-9" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto rounded-lg border">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Mos savollar topilmadi.</p>
          ) : (
            filtered.map((q) => (
              <label key={q.id} className="flex cursor-pointer items-start gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-muted/40">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-[#315ECA]"
                  checked={selected.has(q.id)}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (n.has(q.id)) n.delete(q.id);
                      else n.add(q.id);
                      return n;
                    })
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm text-midnight">{q.text}</span>
                  <span className="text-xs text-muted-foreground">{q.typeLabel}{q.subject ? ` · ${q.subject}` : ""}</span>
                </span>
              </label>
            ))
          )}
        </div>
        {error && <p className="text-sm font-medium text-error">{error}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelected(new Set(filtered.map((q) => q.id)))}
            disabled={!filtered.length}
          >
            Hammasini belgilash
          </Button>
          <Button
            disabled={!selected.size || pending}
            onClick={() =>
              start(async () => {
                const res = await addQuestionsToTestAction(testId, Array.from(selected));
                if (res?.error) setError(res.error);
                else setOpen(false);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {selected.size} ta savolni qo&apos;shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
