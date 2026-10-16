import Link from "next/link";
import { GradeBadge } from "@/components/grade-badge";
import { History } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT } from "@/i18n/server";
import { requireStudent } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { getStudentAttempts } from "@/server/student";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Testlar tarixi") };
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const user = await requireStudent();
  const { t, lang } = await getT();
  const attempts = await getStudentAttempts(user.id);
  const { submitted } = await searchParams;

  return (
    <>
      <PageHeader title={t("Testlar tarixi")} description={t("Siz boshlagan va topshirgan barcha testlar")} />
      {submitted && (
        <div className="mb-4 rounded-lg border border-success/25 bg-success/8 px-4 py-3 text-sm font-medium text-[#146b4f]">
          {t("Test muvaffaqiyatli topshirildi. Javoblaringiz serverda baholandi.")}
        </div>
      )}
      {attempts.length === 0 ? (
        <EmptyState icon={<History />} title={t("Tarix bo'sh")} description={t("Hali birorta test boshlamagansiz.")} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Test")}</TableHead>
                <TableHead>{t("Boshlangan")}</TableHead>
                <TableHead>{t("Topshirilgan")}</TableHead>
                <TableHead>{t("Holat")}</TableHead>
                <TableHead>{t("Natija")}</TableHead>
                <TableHead className="text-right">{t("Amal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold text-midnight">
                    {a.test.title}
                    {a.test.subject && <span className="block text-xs font-normal text-muted-foreground">{a.test.subject}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.startedAt, lang)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.submittedAt, lang)}</TableCell>
                  <TableCell>
                    {a.status === "IN_PROGRESS" ? (
                      <Badge variant="warning">{t("Davom etmoqda")}</Badge>
                    ) : a.autoSubmitted ? (
                      <Badge variant="muted">{t("Avtomatik topshirilgan")}</Badge>
                    ) : (
                      <Badge>{t("Topshirilgan")}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.released && a.percent !== null ? (
                      <span className="inline-flex flex-wrap gap-1.5">
                        <Badge variant={a.percent >= a.test.passingPercent ? "success" : "error"}>
                          {a.score}/{a.maxScore} · {a.percent}%
                        </Badge>
                        <GradeBadge percent={a.percent} />
                      </span>
                    ) : a.status === "SUBMITTED" ? (
                      <span className="text-xs text-muted-foreground">{t("E'lon qilinmagan")}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === "IN_PROGRESS" ? (
                      <Button asChild size="sm" variant="midnight">
                        <Link href={`/exam/${a.id}`}>{t("Davom ettirish")}</Link>
                      </Button>
                    ) : a.released ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/student/results/${a.id}`}>{t("Batafsil")}</Link>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
