"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Flag,
  LayoutGrid,
  Loader2,
  Send,
  Timer,
} from "lucide-react";
import { examStatusAction, reportExamEventAction, saveAnswerAction, submitAttemptAction } from "@/actions/exam";
import { SamuLogo, SamuMark } from "@/components/brand/samu-logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

type QType = "SINGLE" | "MULTIPLE" | "TRUE_FALSE";
type Question = { id: string; text: string; type: QType; points: number; options: { id: string; text: string }[] };
type AnswerState = { selected: string[]; flagged: boolean };
type SaveStatus = "idle" | "saving" | "saved" | "error";

const TYPE_HINT: Record<QType, string> = {
  SINGLE: "Bitta to'g'ri javobni tanlang",
  MULTIPLE: "Barcha to'g'ri javoblarni belgilang",
  TRUE_FALSE: "To'g'ri yoki noto'g'ri ekanini tanlang",
};
const LETTERS = "ABCDEFGHIJ";

function fmt(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function ExamClient(props: {
  attemptId: string;
  /** Yakunlangach o'tiladigan natija sahifasi. */
  resultHref: string;
  title: string;
  subject: string | null;
  deadlineAt: string;
  serverNow: string;
  otherDevice?: boolean;
  questions: Question[];
  initialAnswers: { questionId: string; selectedOptionIds: string[]; flagged: boolean }[];
}) {
  const { attemptId, questions, resultHref } = props;
  const { t } = useT();
  const router = useRouter();
  // Muddat test davomida o'zgarishi mumkin (o'qituvchi vaqtni o'zgartirsa yoki testni yakunlasa)
  const [deadline, setDeadline] = React.useState(() => new Date(props.deadlineAt).getTime());
  const [notice, setNotice] = React.useState<string | null>(() =>
    props.otherDevice ? t("Diqqat: bu test boshqa qurilmada yoki sessiyada ham ochilgan. Bu holat qayd etildi va o'qituvchiga ko'rinadi.") : null,
  );
  // Server va brauzer soatlari orasidagi farq: taymer faqat server muddatiga tayanadi.
  const offsetRef = React.useRef(new Date(props.serverNow).getTime() - Date.now());
  const serverNow = () => Date.now() + offsetRef.current;

  const [answers, setAnswers] = React.useState<Record<string, AnswerState>>(() => {
    const init: Record<string, AnswerState> = {};
    for (const a of props.initialAnswers) init[a.questionId] = { selected: a.selectedOptionIds, flagged: a.flagged };
    return init;
  });
  const storageKey = `samu:exam:${attemptId}:index`;
  const [index, setIndex] = React.useState(0);
  const [remaining, setRemaining] = React.useState(() => deadline - serverNow());
  const [saveStatus, setSaveStatus] = React.useState<SaveStatus>("idle");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [finishing, setFinishing] = React.useState<null | "manual" | "auto">(null);
  const [fatal, setFatal] = React.useState<string | null>(null);

  // Joriy savol raqamini tiklash (faqat qulaylik uchun)
  React.useEffect(() => {
    try {
      const v = Number(localStorage.getItem(storageKey));
      if (Number.isInteger(v) && v >= 0 && v < questions.length) setIndex(v);
    } catch {}
  }, [storageKey, questions.length]);
  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey, String(index));
    } catch {}
  }, [index, storageKey]);

  // ---- Avtomatik saqlash navbati ----
  const dirty = React.useRef(new Map<string, AnswerState>());
  const inflight = React.useRef(false);
  const retryTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = React.useRef(false);

  const goToHistory = React.useCallback(() => {
    stopped.current = true;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    // Yakunlangach talaba darhol natijasini ko'radi (test sozlamasi ruxsat bersa)
    router.replace(resultHref);
    router.refresh();
  }, [router, storageKey, resultHref]);

  const flush = React.useCallback(async (): Promise<boolean> => {
    if (inflight.current || stopped.current) return dirty.current.size === 0;
    const next = dirty.current.entries().next();
    if (next.done) {
      setSaveStatus((s) => (s === "saving" ? "saved" : s));
      return true;
    }
    const [questionId, state] = next.value;
    inflight.current = true;
    setSaveStatus("saving");
    try {
      const res = await saveAnswerAction({
        attemptId,
        questionId,
        selectedOptionIds: state.selected,
        flagged: state.flagged,
      });
      offsetRef.current = new Date(res.serverNow).getTime() - Date.now();
      if (res.ok) {
        if (dirty.current.get(questionId) === state) dirty.current.delete(questionId);
      } else if (res.code === "EXPIRED" || res.code === "ALREADY_SUBMITTED") {
        dirty.current.clear();
        setFatal(res.error);
        stopped.current = true;
        return false;
      } else if (res.code === "INVALID" || res.code === "NOT_FOUND" || res.code === "FORBIDDEN") {
        dirty.current.delete(questionId);
        setSaveStatus("error");
      } else {
        throw new Error(res.error);
      }
    } catch {
      inflight.current = false;
      setSaveStatus("error");
      if (retryTimer.current) clearTimeout(retryTimer.current);
      retryTimer.current = setTimeout(() => void flush(), 2500);
      return false;
    }
    inflight.current = false;
    if (dirty.current.size > 0) return flush();
    setSaveStatus("saved");
    return true;
  }, [attemptId]);

  const update = (questionId: string, patch: Partial<AnswerState>) => {
    if (finishing || fatal) return;
    setAnswers((prev) => {
      const cur = prev[questionId] ?? { selected: [], flagged: false };
      const nextState = { ...cur, ...patch };
      dirty.current.set(questionId, nextState);
      return { ...prev, [questionId]: nextState };
    });
    queueMicrotask(() => void flush());
  };

  // Saqlanmagan javob bo'lsa, sahifani tark etishdan ogohlantirish
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0 || inflight.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // ---- Topshirish ----
  const finish = React.useCallback(
    async (mode: "manual" | "auto") => {
      if (stopped.current) return;
      setFinishing(mode);
      // Kutilayotgan javoblarni yuborishga urinib ko'ramiz (server muddatdan keyin 3 soniya qabul qiladi)
      for (let i = 0; i < 3 && dirty.current.size > 0 && !stopped.current; i++) {
        await flush();
      }
      if (stopped.current) return;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const res = await submitAttemptAction(attemptId);
          if (res.ok || res.code === "ALREADY_SUBMITTED") return goToHistory();
          if (res.code === "NOT_FOUND") {
            setFatal(res.error);
            return;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
      setFinishing(null);
      setFatal("Topshirishda tarmoq xatosi yuz berdi. Internet aloqasini tekshirib, sahifani yangilang — javoblaringiz serverda saqlangan.");
    },
    [attemptId, flush, goToHistory],
  );

  // ---- Muddat o'zgarishini kuzatish ----
  React.useEffect(() => {
    const check = async () => {
      if (stopped.current) return;
      try {
        const res = await examStatusAction(attemptId);
        offsetRef.current = new Date(res.serverNow).getTime() - Date.now();
        if (res.status === "SUBMITTED") {
          setNotice(t("Test muddatidan oldin yakunlandi. Javoblaringiz avtomatik topshirildi."));
          stopped.current = true;
          setTimeout(goToHistory, 3000);
          return;
        }
        if (res.deadlineAt) {
          const next = new Date(res.deadlineAt).getTime();
          setDeadline((prev) => {
            if (Math.abs(prev - next) > 1000) {
              setNotice(t("Diqqat: test vaqti o'zgartirildi. Taymer yangi vaqtga moslandi."));
              return next;
            }
            return prev;
          });
        }
      } catch {}
    };
    const id = setInterval(check, 15_000);
    const onVisible = () => document.visibilityState === "visible" && void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [attemptId, goToHistory, t]);

  // ---- Imtihon nazorati: boshqa oynaga o'tish va nusxa olish qayd etiladi ----
  React.useEffect(() => {
    const last: Record<string, number> = {};
    const report = (kind: "tab" | "copy") => {
      const now = Date.now();
      if (now - (last[kind] ?? 0) < 2000) return;
      last[kind] = now;
      void reportExamEventAction(attemptId, kind).catch(() => {});
    };
    const onHidden = () => document.visibilityState === "hidden" && report("tab");
    const onBlur = () => report("tab");
    const onCopy = (e: Event) => {
      e.preventDefault();
      report("copy");
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onBlur);
    for (const ev of ["copy", "cut", "contextmenu"]) document.addEventListener(ev, onCopy);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onBlur);
      for (const ev of ["copy", "cut", "contextmenu"]) document.removeEventListener(ev, onCopy);
    };
  }, [attemptId]);

  // ---- Taymer ----
  const autoFired = React.useRef(false);
  React.useEffect(() => {
    const tick = () => {
      const left = deadline - serverNow();
      setRemaining(left);
      if (left <= 0 && !autoFired.current) {
        autoFired.current = true;
        setConfirmOpen(false);
        void finish("auto");
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [deadline, finish]);

  // ---- Klaviatura navigatsiyasi ----
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") setIndex((i) => Math.min(questions.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen, questions.length]);

  const q = questions[index]!;
  const a = answers[q.id] ?? { selected: [], flagged: false };
  const answeredCount = questions.filter((x) => (answers[x.id]?.selected.length ?? 0) > 0).length;
  const flaggedCount = questions.filter((x) => answers[x.id]?.flagged).length;
  const unanswered = questions.length - answeredCount;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const low = remaining <= 5 * 60_000;
  const critical = remaining <= 60_000;

  const choose = (optionId: string) => {
    if (q.type === "MULTIPLE") {
      const set = new Set(a.selected);
      if (set.has(optionId)) set.delete(optionId);
      else set.add(optionId);
      update(q.id, { selected: q.options.map((o) => o.id).filter((id) => set.has(id)) });
    } else {
      update(q.id, { selected: a.selected[0] === optionId ? [] : [optionId] });
    }
  };

  const navigator = (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-midnight">{t("Savollar")}</p>
        <p className="text-xs text-muted-foreground">
          {t("{answered}/{total} javob berildi", { answered: answeredCount, total: questions.length })}
        </p>
      </div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
        {questions.map((x, i) => {
          const st = answers[x.id];
          const answered = (st?.selected.length ?? 0) > 0;
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => {
                setIndex(i);
                setNavOpen(false);
              }}
              aria-label={`${t("{n}-savol", { n: i + 1 })}, ${answered ? t("javob berilgan") : t("javob berilmagan")}${st?.flagged ? `, ${t("belgilangan")}` : ""}`}
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "relative flex h-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors cursor-pointer",
                answered ? "border-royal bg-royal text-white" : "border-border bg-card text-midnight hover:border-royal/50",
                i === index && "ring-2 ring-midnight ring-offset-2",
              )}
            >
              {i + 1}
              {st?.flagged && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-card bg-warning" />}
            </button>
          );
        })}
      </div>
      <ul className="mt-4 grid gap-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2"><span className="size-3 rounded bg-royal" /> {t("Javob berilgan")} ({answeredCount})</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded border border-border bg-card" /> {t("Javob berilmagan")} ({unanswered})</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded-full bg-warning" /> {t("Ko'rib chiqish uchun belgilangan")} ({flaggedCount})</li>
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* Yuqori panel */}
      <header className="sticky top-0 z-30 bg-midnight text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <SamuLogo tone="dark" size="sm" className="hidden sm:inline-flex" />
          <SamuMark size={28} className="sm:hidden" />
          <span className="hidden h-6 w-px bg-white/15 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold sm:text-base">{props.title}</p>
            {props.subject && <p className="truncate text-xs text-white/60">{props.subject}</p>}
          </div>
          <SaveIndicator status={saveStatus} />
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-base font-bold tabular-nums",
              critical ? "bg-error text-white" : low ? "bg-warning text-midnight" : "bg-white/10",
            )}
            role="timer"
            aria-live="off"
            aria-label={t("Qolgan vaqt {time}", { time: fmt(remaining) })}
          >
            <Timer className="size-4" />
            {fmt(remaining)}
          </div>
          <Button
            variant="default"
            size="sm"
            className="hidden sm:inline-flex"
            onClick={() => setConfirmOpen(true)}
            disabled={!!finishing || !!fatal}
          >
            <Send /> {t("Yakunlash")}
          </Button>
        </div>
        <div className="h-1 bg-white/10">
          <div className="h-full bg-royal transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </header>
      {notice && (
        <div role="alert" className="border-b border-warning/40 bg-warning/15 px-4 py-3 text-center text-sm font-semibold text-midnight">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-3 cursor-pointer text-xs font-medium text-muted-foreground underline">
            {t("Yopish")}
          </button>
        </div>
      )}

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_300px]">
        <section aria-labelledby="question-title" className="flex flex-col">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-midnight px-3 py-1 text-xs font-bold text-white">
                {index + 1} / {questions.length}
              </span>
              <span className="text-xs font-medium text-muted-foreground">{t(TYPE_HINT[q.type])}</span>
              <span className="ml-auto text-xs font-semibold text-royal">{t("{points} ball", { points: q.points })}</span>
            </div>
            <h1 id="question-title" className="mt-5 whitespace-pre-line text-lg font-bold leading-relaxed text-midnight sm:text-xl">
              {q.text}
            </h1>
            <div role={q.type === "MULTIPLE" ? "group" : "radiogroup"} aria-labelledby="question-title" className="mt-6 grid gap-3">
              {q.options.map((o, i) => {
                const checked = a.selected.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    role={q.type === "MULTIPLE" ? "checkbox" : "radio"}
                    aria-checked={checked}
                    onClick={() => choose(o.id)}
                    disabled={!!finishing || !!fatal}
                    className={cn(
                      "flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3.5 text-left text-sm transition-colors sm:text-base cursor-pointer disabled:cursor-not-allowed",
                      checked ? "border-royal bg-royal/6" : "border-border hover:border-royal/40 hover:bg-muted/50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center text-sm font-bold",
                        q.type === "MULTIPLE" ? "rounded-md" : "rounded-full",
                        checked ? "bg-royal text-white" : "bg-muted text-midnight",
                      )}
                    >
                      {checked && q.type === "MULTIPLE" ? <Check className="size-4" /> : LETTERS[i]}
                    </span>
                    <span className="flex-1 text-foreground">{o.text}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <Button
                variant={a.flagged ? "secondary" : "outline"}
                size="sm"
                onClick={() => update(q.id, { flagged: !a.flagged })}
                aria-pressed={a.flagged}
                disabled={!!finishing || !!fatal}
                className={cn(a.flagged && "border border-warning/50 bg-warning/15 text-[#8a5a12] hover:bg-warning/25")}
              >
                <Flag /> {a.flagged ? t("Belgi qo'yilgan") : t("Keyinroq ko'rib chiqish")}
              </Button>
              {a.selected.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => update(q.id, { selected: [] })} disabled={!!finishing || !!fatal}>
                  {t("Javobni tozalash")}
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ChevronLeft /> {t("Oldingi")}
            </Button>
            <Button variant="outline" className="lg:hidden" onClick={() => setNavOpen(true)}>
              <LayoutGrid /> {answeredCount}/{questions.length}
            </Button>
            {index < questions.length - 1 ? (
              <Button variant="midnight" onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
                {t("Keyingi")} <ChevronRight />
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)} disabled={!!finishing || !!fatal}>
                <Send /> {t("Yakunlash")}
              </Button>
            )}
          </div>
        </section>

        <aside className="hidden lg:block">
          <div className="sticky top-24 grid gap-4">
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)]">{navigator}</div>
            <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={!!finishing || !!fatal}>
              <Send /> {t("Testni yakunlash")}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobil savollar paneli */}
      <Dialog open={navOpen} onOpenChange={setNavOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Savollar bo'yicha o'tish")}</DialogTitle>
            <DialogDescription>{t("Savol raqamini bosib, unga o'ting.")}</DialogDescription>
          </DialogHeader>
          {navigator}
          <Button onClick={() => { setNavOpen(false); setConfirmOpen(true); }} disabled={!!finishing || !!fatal}>
            <Send /> {t("Testni yakunlash")}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Topshirishni tasdiqlash */}
      <Dialog open={confirmOpen} onOpenChange={(o) => !finishing && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Testni yakunlaysizmi?")}</DialogTitle>
            <DialogDescription>{t("Topshirilgandan so'ng javoblarni o'zgartirib bo'lmaydi.")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-royal/8 p-3">
              <p className="text-xl font-extrabold text-royal">{answeredCount}</p>
              <p className="text-xs text-muted-foreground">{t("Javob berilgan")}</p>
            </div>
            <div className={cn("rounded-lg p-3", unanswered ? "bg-error/8" : "bg-muted")}>
              <p className={cn("text-xl font-extrabold", unanswered ? "text-error" : "text-midnight")}>{unanswered}</p>
              <p className="text-xs text-muted-foreground">{t("Javobsiz")}</p>
            </div>
            <div className="rounded-lg bg-warning/12 p-3">
              <p className="text-xl font-extrabold text-[#9a6413]">{flaggedCount}</p>
              <p className="text-xs text-muted-foreground">{t("Belgilangan")}</p>
            </div>
          </div>
          {unanswered > 0 && (
            <p className="flex items-start gap-2 text-sm text-[#a52f2f]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {t("{n} ta savolga javob bermagansiz. Ular noto'g'ri deb hisoblanadi.", { n: unanswered })}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={!!finishing}>{t("Testga qaytish")}</Button>
            </DialogClose>
            <Button onClick={() => void finish("manual")} disabled={!!finishing}>
              {finishing ? <Loader2 className="animate-spin" /> : <Send />}
              {t("Ha, topshirish")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(finishing === "auto" || fatal) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-midnight/70 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center shadow-xl">
            {fatal ? (
              <>
                <AlertTriangle className="mx-auto size-10 text-warning" />
                <p className="mt-3 font-bold text-midnight">{t(fatal)}</p>
                <Button className="mt-5 w-full" onClick={goToHistory}>{t("Testlar tarixiga o'tish")}</Button>
              </>
            ) : (
              <>
                <Loader2 className="mx-auto size-10 animate-spin text-royal" />
                <p className="mt-3 font-bold text-midnight">{t("Vaqt tugadi")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("Javoblaringiz avtomatik topshirilmoqda...")}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  const { t } = useT();
  if (status === "idle") return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-white/70" aria-live="polite">
      {status === "saving" && (<><Loader2 className="size-3.5 animate-spin" /> <span className="hidden md:inline">{t("Saqlanmoqda...")}</span></>)}
      {status === "saved" && (<><Check className="size-3.5 text-success" /> <span className="hidden md:inline">{t("Saqlandi")}</span></>)}
      {status === "error" && (<><CloudOff className="size-3.5 text-warning" /> <span className="hidden md:inline">{t("Saqlanmadi, qayta urinilmoqda")}</span></>)}
    </span>
  );
}
