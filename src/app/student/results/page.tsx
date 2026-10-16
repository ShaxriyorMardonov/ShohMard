import Link from "next/link";
import { Award, BarChart3, CheckCircle2, Target } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { requireStudent } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { getStudentAttempts } from "@/server/student";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Natijalarim") };
}

export default async function ResultsPage() {
  const user = await requireStudent();
  const { t, lang } = await getT();
  const attempts = await getStudentAttempts(user.id);
  const released = attempts.filter((a) => a.released && a.percent !== null);
  const pending = attempts.filter((a) => a.status === "SUBMITTED" && !a.released).length;
  const avg = released.length ? released.reduce((s, a) => s + (a.percent ?? 0), 0) / released.length : null;
  const best = released.length ? Math.max(...released.map((a) => a.percent ?? 0)) : null;
  const passed = released.filter((a) => (a.percent ?? 0) >= a.test.passingPercent).length;

  return (
    <>
      <PageHeader title={t("Natijalarim")} description={t("E'lon qilingan imtihon natijalaringiz")} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("O'rtacha natija")} value={avg === null ? "—" : `${avg.toFixed(1)}%`} icon={<Target />} />
        <StatCard label={t("Eng yuqori natija")} value={best === null ? "—" : `${best}%`} icon={<Award />} tone="warning" />
        <StatCard label={t("Muvaffaqiyatli")} value={`${passed} / ${released.length}`} hint={pending ? t("{n} ta natija e'lon qilinishi kutilmoqda", { n: pending }) : undefined} icon={<CheckCircle2 />} tone="success" />
      </div>
      {released.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title={t("E'lon qilingan natijalar yo'q")} description={t("Natijalar e'lon qilingach shu yerda ko'rinadi.")} />
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
                    {formatDateTime(a.submittedAt, lang)}
                  </p>
                  <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={a.percent ?? 0} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full ${pass ? "bg-success" : "bg-error"}`} style={{ width: `${a.percent ?? 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-midnight">{a.percent}%</p>
                    <p className="text-xs text-muted-foreground">
                      {t("{score}/{max} ball · {correct}/{total} to'g'ri", { score: a.score, max: a.maxScore, correct: a.correctCount, total: a.totalQuestions })}
                    </p>
                  </div>
                  <Badge variant={pass ? "success" : "error"}>{pass ? t("O'tdi") : t("O'tmadi")}</Badge>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/student/results/${a.id}`}>{t("Batafsil")}</Link>
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
