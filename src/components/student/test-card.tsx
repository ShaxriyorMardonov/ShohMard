import Link from "next/link";
import { CalendarClock, Clock, FileQuestion, PlayCircle, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StudentTest, StudentTestStatus } from "@/server/student";
import { formatDateTime, formatDuration } from "@/lib/time";

export const STATUS_META: Record<StudentTestStatus, { label: string; variant: "default" | "success" | "warning" | "error" | "muted" }> = {
  open: { label: "Ochiq", variant: "success" },
  in_progress: { label: "Davom etmoqda", variant: "warning" },
  submitted: { label: "Topshirilgan", variant: "default" },
  upcoming: { label: "Kutilmoqda", variant: "muted" },
  missed: { label: "Yakunlangan", variant: "error" },
};

export function TestStatusBadge({ status }: { status: StudentTestStatus }) {
  const m = STATUS_META[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

export function TestAction({ test, size = "sm" }: { test: StudentTest; size?: "sm" | "default" }) {
  if (test.status === "open")
    return (
      <Button asChild size={size}>
        <Link href={`/student/tests/${test.id}`}>
          <PlayCircle /> Testni boshlash
        </Link>
      </Button>
    );
  if (test.status === "in_progress" && test.attempt)
    return (
      <Button asChild size={size} variant="midnight">
        <Link href={`/exam/${test.attempt.id}`}>
          <RotateCcw /> Davom ettirish
        </Link>
      </Button>
    );
  if (test.status === "submitted" && test.attempt && test.released)
    return (
      <Button asChild size={size} variant="outline">
        <Link href={`/student/results/${test.attempt.id}`}>Natijani ko&apos;rish</Link>
      </Button>
    );
  return null;
}

export function TestCard({ test }: { test: StudentTest }) {
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
          <dt className="sr-only">Vaqt oralig&apos;i</dt>
          <dd>
            {formatDateTime(test.startsAt)} — {formatDateTime(test.endsAt)}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span className="flex items-center gap-2">
            <Clock className="size-4 text-royal/80" />
            {formatDuration(test.durationMinutes)}
          </span>
          <span className="flex items-center gap-2">
            <FileQuestion className="size-4 text-royal/80" />
            {test._count.questions} ta savol
          </span>
        </div>
      </dl>
      <div className="mt-5 flex items-center justify-end gap-2 empty:hidden">
        <TestAction test={test} />
      </div>
    </div>
  );
}
