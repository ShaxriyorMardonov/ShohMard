"use client";

import Link from "next/link";
import { Award, CalendarClock, Clock, FileQuestion, PlayCircle, RotateCcw } from "lucide-react";
import { TestStatusBadge } from "@/components/student/test-card";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { formatDateTime, formatDuration } from "@/lib/time";
import type { StudentTest } from "@/server/student";

/** Olimpiada kartasi: vaqt, savollar soni, holat va keyingi qadam. */
export function OlympiadCard({ test }: { test: StudentTest }) {
  const { t, lang } = useT();
  const questions = test.questionsPerAttempt ? Math.min(test.questionsPerAttempt, test._count.questions) : test._count.questions;
  return (
    <div className="flex flex-col rounded-xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {test.subject && <p className="text-xs font-semibold uppercase tracking-wide text-royal">{test.subject}</p>}
          <h3 className="mt-1 font-bold leading-snug text-midnight">{test.title}</h3>
        </div>
        <TestStatusBadge status={test.status} />
      </div>
      <dl className="mt-4 grid gap-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-royal/80" />
          <dt className="sr-only">{t("Vaqt oralig'i")}</dt>
          <dd>{formatDateTime(test.startsAt, lang)} — {formatDateTime(test.endsAt, lang)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="flex items-center gap-2"><Clock className="size-4 text-royal/80" />{formatDuration(test.durationMinutes, lang)}</span>
          <span className="flex items-center gap-2"><FileQuestion className="size-4 text-royal/80" />{t("{n} ta savol", { n: questions })}</span>
          <span className="flex items-center gap-2"><Award className="size-4 text-royal/80" />{t("100 ball")}</span>
          {test.maxAttempts > 1 && (
            <span className="flex items-center gap-2">
              <RotateCcw className="size-4 text-royal/80" />
              {t("Urinishlar: {used} / {max}", { used: test.attemptsUsed, max: test.maxAttempts })}
            </span>
          )}
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {test.attempt && test.released && test.status !== "in_progress" && (
          <Button asChild size="sm" variant="outline">
            <Link href={`/olympiad/results/${test.attempt.id}`}>{t("Natijani ko'rish")}</Link>
          </Button>
        )}
        {test.status === "in_progress" && test.attempt ? (
          <Button asChild size="sm" variant="midnight">
            <Link href={`/exam/${test.attempt.id}`}><RotateCcw /> {t("Davom ettirish")}</Link>
          </Button>
        ) : test.status === "open" || test.status === "upcoming" ? (
          <Button asChild size="sm" variant={test.status === "open" ? "default" : "outline"}>
            <Link href={`/olympiad/tests/${test.id}`}>
              <PlayCircle /> {test.status === "upcoming" ? t("Batafsil") : test.attempt ? t("Qayta topshirish") : t("Qatnashish")}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
