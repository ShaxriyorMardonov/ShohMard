"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { importQuestionsTextAction } from "@/actions/import";
import { QuestionTextEditor, useQuestionTextStatus } from "@/components/admin/question-text-editor";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/i18n/client";

/** Testga savollarni Word fayldan yuklash: matn platformada ko'rsatiladi va tuzatiladi. */
export function WordImportDialog({ testId }: { testId: string }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const status = useQuestionTextStatus(text);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm"><FileText /> {t("Word fayl yuklash")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Savollarni Word fayldan yuklash")}</DialogTitle>
          <DialogDescription>{t("Fayl standartga mos kelmasa, xatolar ko'rsatiladi va ularni shu yerda tuzatishingiz mumkin.")}</DialogDescription>
        </DialogHeader>
        <QuestionTextEditor value={text} onChange={setText} />
        {error && <p className="text-sm font-medium text-error">{t(error)}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{t("Bekor qilish")}</Button>
          <Button
            disabled={pending || status.count === 0 || status.issues > 0}
            onClick={() =>
              start(async () => {
                const r = await importQuestionsTextAction(testId, text);
                if (!r.ok) return setError(r.error ?? "Faylni yuklashda xatolik yuz berdi");
                setText("");
                setOpen(false);
                router.refresh();
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {status.count ? t("{n} ta savolni testga qo'shish", { n: status.count }) : t("Testga qo'shish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
