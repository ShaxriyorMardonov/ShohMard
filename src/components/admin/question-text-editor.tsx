"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Download, FileText, Loader2, Upload } from "lucide-react";
import { extractQuestionsFileAction } from "@/actions/import";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { parseQuestionText } from "@/lib/question-text-parser";
import { QUESTION_TYPE_LABEL } from "@/lib/exam-rules";
import { useT } from "@/i18n/client";

const LETTERS = "ABCDEF";

/** Matnning berilgan qatoriga o'tib, uni belgilaydi. */
function selectLine(el: HTMLTextAreaElement, line: number) {
  const lines = el.value.split("\n");
  let start = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) start += lines[i]!.length + 1;
  const end = start + (lines[line - 1]?.length ?? 0);
  el.focus();
  el.setSelectionRange(start, start);
  // Qatorni ko'rinadigan joyga keltirish: matnni shu qatorgacha kesib, balandligini o'lchaymiz
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
  const mirror = document.createElement("textarea");
  mirror.style.cssText = `position:absolute;visibility:hidden;height:0;width:${el.clientWidth}px;font:${getComputedStyle(el).font};padding:${getComputedStyle(el).padding};white-space:pre-wrap;word-wrap:break-word;`;
  mirror.value = el.value.slice(0, start);
  document.body.appendChild(mirror);
  const top = mirror.scrollHeight;
  mirror.remove();
  el.scrollTop = Math.max(0, top - lh * 3);
  el.setSelectionRange(start, end);
}

/**
 * Word fayldagi savollarni platformada ko'rish va tuzatish.
 * Fayl matnga aylantiriladi, xatolar qator raqami bilan ko'rsatiladi va matnni shu yerning o'zida tahrirlash mumkin.
 */
export function QuestionTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useT();
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const text = React.useDeferredValue(value);
  const parsed = React.useMemo(() => (text.trim() ? parseQuestionText(text, t) : null), [text, t]);

  async function pick(file: File) {
    setLoading(true);
    setFileError(null);
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await extractQuestionsFileAction(fd);
      if (res.error) setFileError(res.error);
      else {
        onChange(res.text ?? "");
        setFileName(file.name);
      }
    } catch {
      setFileError("Faylni yuklashda xatolik yuz berdi");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".doc,.docx"
          className="hidden"
          aria-label={t("Word faylni tanlash")}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
          }}
        />
        <Button type="button" variant="outline" disabled={loading} onClick={() => fileRef.current?.click()}>
          {loading ? <Loader2 className="animate-spin" /> : <Upload />} {t("Word faylni tanlash")}
        </Button>
        {fileName && (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="size-4" /> {fileName}
          </span>
        )}
        <Button asChild type="button" variant="ghost" size="sm" className="ml-auto">
          <a href="/admin/templates/savollar.docx" download><Download /> {t("Word namuna")}</a>
        </Button>
      </div>
      {fileError && <Alert variant="error"><AlertCircle /><span>{t(fileError)}</span></Alert>}

      <button type="button" onClick={() => setShowHelp((v) => !v)} className="flex w-fit cursor-pointer items-center gap-1 text-xs font-semibold text-royal">
        <ChevronDown className={`size-3.5 transition-transform ${showHelp ? "rotate-180" : ""}`} /> {t("Fayl qanday bo'lishi kerak?")}
      </button>
      {showHelp && (
        <div className="grid gap-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold text-midnight">{t("1-usul (HEMIS)")}</p>
            <pre className="whitespace-pre-wrap font-mono">{"Savol matni?\n====\n#to'g'ri javob\n====\nvariant\n====\nvariant\n++++\nKeyingi savol?"}</pre>
            <p className="mt-1">{t("Savollar ++++ bilan, variantlar ==== bilan ajratiladi, to'g'ri javob oldiga # qo'yiladi.")}</p>
          </div>
          <div>
            <p className="mb-1 font-semibold text-midnight">{t("2-usul")}</p>
            <pre className="whitespace-pre-wrap font-mono">{"1. Savol matni?\nA) variant\n*B) to'g'ri javob\nC) variant\n\n2. Keyingi savol?"}</pre>
            <p className="mt-1">{t("Savol raqam bilan boshlanadi, variantlar A) B) C) bilan, to'g'ri javob oldiga * qo'yiladi.")}</p>
          </div>
        </div>
      )}

      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={14}
        spellCheck={false}
        placeholder={t("Word faylni tanlang yoki savollarni shu yerga yozing / joylashtiring")}
        aria-label={t("Savollar matni")}
        className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-[13px] leading-5 outline-none focus-visible:border-royal focus-visible:ring-3 focus-visible:ring-royal/20"
      />

      {parsed && (
        parsed.issues.length > 0 ? (
          <div className="rounded-lg border border-error/30 bg-error/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-error">
              <AlertCircle className="size-4" />
              {t("{n} ta xato topildi. Xatoni bosing, matnda o'sha joy belgilanadi, uni shu yerda tuzating.", { n: parsed.issues.length })}
            </p>
            <ul className="grid max-h-56 gap-1 overflow-y-auto text-sm">
              {parsed.issues.map((is, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => ref.current && selectLine(ref.current, is.line)}
                    className="w-full cursor-pointer rounded px-2 py-1 text-left hover:bg-error/10"
                  >
                    <span className="mr-2 font-mono text-xs font-semibold text-error">{t("{n}-qator", { n: is.line })}</span>
                    {is.message}
                  </button>
                </li>
              ))}
            </ul>
            {parsed.questions.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">{t("Xatosiz savollar: {n} ta", { n: parsed.questions.length })}</p>
            )}
          </div>
        ) : (
          <Alert variant="success">
            <CheckCircle2 />
            <span>{t("Xato yo'q: {n} ta savol yuklashga tayyor.", { n: parsed.questions.length })}</span>
          </Alert>
        )
      )}

      {parsed && parsed.questions.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowPreview((v) => !v)} className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-royal">
            <ChevronDown className={`size-3.5 transition-transform ${showPreview ? "rotate-180" : ""}`} /> {t("Savollarni ko'rib chiqish ({n})", { n: parsed.questions.length })}
          </button>
          {showPreview && (
            <ol className="mt-2 grid max-h-96 gap-3 overflow-y-auto rounded-lg border p-3 text-sm">
              {parsed.questions.map((q, i) => (
                <li key={i}>
                  <p className="font-semibold text-midnight">
                    {i + 1}. <span className="whitespace-pre-line">{q.text}</span>
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{t(QUESTION_TYPE_LABEL[q.type])}</span>
                  </p>
                  <ul className="mt-1 grid gap-0.5 pl-4">
                    {q.options.map((o, j) => (
                      <li key={j} className={o.isCorrect ? "font-semibold text-success" : "text-muted-foreground"}>
                        {LETTERS[j]}) {o.text} {o.isCorrect && "✓"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

/** Matnda xato bormi (yuklash tugmasini bloklash uchun). */
export function useQuestionTextStatus(value: string) {
  const { t } = useT();
  return React.useMemo(() => {
    if (!value.trim()) return { count: 0, issues: 0 };
    const p = parseQuestionText(value, t);
    return { count: p.questions.length, issues: p.issues.length };
  }, [value, t]);
}
