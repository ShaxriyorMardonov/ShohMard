"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Download, Upload } from "lucide-react";
import { importAction } from "@/actions/import";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";

type Kind = "universities" | "students" | "questions";

const META: Record<Kind, { title: string; description: string; accept: string; templates: { href: string; label: string }[]; noun: string }> = {
  universities: {
    title: "Universitetlarni Excel'dan yuklash",
    description: "Ustunlar: Nomi, Qisqa nomi, Shahar. Mavjud universitetlar qayta qo'shilmaydi.",
    accept: ".xlsx",
    templates: [{ href: "/admin/templates/universitetlar.xlsx", label: "Excel namuna" }],
    noun: "universitet",
  },
  students: {
    title: "Talabalarni Excel'dan yuklash",
    description: "Ustunlar: F.I.Sh., Login, Parol, Universitet (qisqa nomi), Guruh. Universitetlar oldindan qo'shilgan bo'lishi kerak.",
    accept: ".xlsx",
    templates: [{ href: "/admin/templates/talabalar.xlsx", label: "Excel namuna" }],
    noun: "talaba",
  },
  questions: {
    title: "Savollarni fayldan yuklash",
    description: "Word (.doc, .docx): savollar ++++ bilan, variantlar ==== bilan ajratiladi, to'g'ri javob oldiga # qo'yiladi. Yoki: 1. Savol, A) B) variantlar, to'g'ri javob oldiga *. Excel ham qabul qilinadi.",
    accept: ".doc,.docx,.xlsx",
    templates: [
      { href: "/admin/templates/savollar.docx", label: "Word namuna" },
      { href: "/admin/templates/savollar.xlsx", label: "Excel namuna" },
    ],
    noun: "savol",
  },
};

export function ImportDialog({ kind, testId, trigger }: { kind: Kind; testId?: string; trigger?: React.ReactNode }) {
  const m = META[kind];
  const [open, setOpen] = React.useState(false);
  const [key, setKey] = React.useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setKey((k) => k + 1);
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <Upload /> Fayldan yuklash
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.title}</DialogTitle>
          <DialogDescription>{m.description}</DialogDescription>
        </DialogHeader>
        <ImportForm key={key} kind={kind} testId={testId} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function ImportForm({ kind, testId, onDone }: { kind: Kind; testId?: string; onDone: () => void }) {
  const m = META[kind];
  const router = useRouter();
  const [state, action] = useActionState(importAction.bind(null, kind, testId ?? null), null);
  React.useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {m.templates.map((t) => (
          <Button key={t.href} asChild size="sm" variant="secondary">
            <a href={t.href} download>
              <Download /> {t.label}
            </a>
          </Button>
        ))}
      </div>
      <input
        type="file"
        name="file"
        accept={m.accept}
        required
        className="block w-full rounded-lg border border-input bg-card text-sm file:mr-3 file:cursor-pointer file:border-0 file:bg-secondary file:px-4 file:py-2.5 file:font-semibold file:text-midnight"
      />
      {state?.ok && (
        <Alert variant="success">
          <CheckCircle2 />
          <span>
            {state.created} ta {m.noun} qo&apos;shildi
            {state.skipped ? `, ${state.skipped} tasi avvaldan mavjud bo'lgani uchun o'tkazib yuborildi` : ""}.
          </span>
        </Alert>
      )}
      {state && !state.ok && (
        <Alert variant="error">
          <AlertCircle />
          <div className="grid gap-1">
            <span className="font-semibold">{state.message ?? "Faylda xatolar bor, hech narsa yuklanmadi. Tuzatib qayta yuklang:"}</span>
            {state.errors && (
              <ul className="max-h-48 list-disc overflow-y-auto pl-4 text-xs">
                {state.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        </Alert>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {state?.ok ? "Yopish" : "Bekor qilish"}
        </Button>
        <SubmitButton pendingText="Yuklanmoqda...">
          <Upload /> Yuklash
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}
