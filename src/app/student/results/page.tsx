import type { Metadata } from "next";
import Link from "next/link";
import { Award, BarChart3, CheckCircle2, Target } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireStudent } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { getStudentAttempts } from "@/server/student";

export const metadata: Metadata = { title: "Natijalarim" };

export default async function ResultsPage() {
  const user = await requireStudent();
  const attempts = await getStudentAttempts(user.id);
  const released = attempts.filter((a) => a.released && a.percent !== null);
  const pending = attempts.filter((a) => a.status === "SUBMITTED" && !a.released).length;
  const avg = released.length ? released.reduce((s, a) => s + (a.percent ?? 0), 0) / released.length : null;
  const best = released.length ? Math.max(...released.map((a) => a.percent ?? 0)) : null;
  const passed = released.filter((a) => (a.percent ?? 0) >= a.test.passingPercent).length;

  return (
    <>
      <PageHeader title="Natijalarim" description="E'lon qilingan imtihon natijalaringiz" />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="O'rtacha natija" value={avg === null ? "—" : `${avg.toFixed(1)}%`} icon={<Target />} />
        <StatCard label="Eng yuqori natija" value={best === null ? "—" : `${best}%`} icon={<Award />} tone="warning" />
        <StatCard label="Muvaffaqiyatli" value={`${passed} / ${released.length}`} hint={pending ? `${pending} ta natija e'lon qilinishi kutilmoqda` : undefined} icon={<CheckCircle2 />} tone="success" />
      </div>
      {released.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="E'lon qilingan natijalar yo'q" description="Natijalar e'lon qilingach shu yerda ko'rinadi." />
      ) : (
        <div className="grid gap-3">
          {released.map((a) => {
            const pass = (a.percent ?? 0) >= a.test.passingPercent;
            return (
              <div key={a.id} className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-midnight">{a.test.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.test.subject ? `${a.test.subject} · ` : ""}
                    {formatDateTime(a.submittedAt)}
                  </p>
                  <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={a.percent ?? 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full ${pass ? "bg-success" : "bg-error"}`} style={{ width: `${a.percent ?? 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-midnight">{a.percent}%</p>
                    <p className="text-xs text-muted-foreground">
                      {a.score}/{a.maxScore} ball · {a.correctCount}/{a.totalQuestions} to&apos;g&apos;ri
                    </p>
                  </div>
                  <Badge variant={pass ? "success" : "error"}>{pass ? "O'tdi" : "O'tmadi"}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/student/results/${a.id}`}>Batafsil</Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
