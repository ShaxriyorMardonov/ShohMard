import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireStudent } from "@/lib/auth";
import { formatDateTime } from "@/lib/time";
import { getStudentAttempts } from "@/server/student";

export const metadata: Metadata = { title: "Testlar tarixi" };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const user = await requireStudent();
  const attempts = await getStudentAttempts(user.id);
  const { submitted } = await searchParams;

  return (
    <>
      <PageHeader title="Testlar tarixi" description="Siz boshlagan va topshirgan barcha testlar" />
      {submitted && (
        <div className="mb-4 rounded-lg border border-success/25 bg-success/8 px-4 py-3 text-sm font-medium text-[#146b4f]">
          Test muvaffaqiyatli topshirildi. Javoblaringiz serverda baholandi.
        </div>
      )}
      {attempts.length === 0 ? (
        <EmptyState icon={<History />} title="Tarix bo'sh" description="Hali birorta test boshlamagansiz." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Boshlangan</TableHead>
                <TableHead>Topshirilgan</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Natija</TableHead>
                <TableHead className="text-right">Amal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold text-midnight">
                    {a.test.title}
                    {a.test.subject && <span className="block text-xs font-normal text-muted-foreground">{a.test.subject}</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.startedAt)}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(a.submittedAt)}</TableCell>
                  <TableCell>
                    {a.status === "IN_PROGRESS" ? (
                      <Badge variant="warning">Davom etmoqda</Badge>
                    ) : a.autoSubmitted ? (
                      <Badge variant="muted">Avtomatik topshirilgan</Badge>
                    ) : (
                      <Badge>Topshirilgan</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.released && a.percent !== null ? (
                      <Badge variant={a.percent >= a.test.passingPercent ? "success" : "error"}>
                        {a.score}/{a.maxScore} · {a.percent}%
                      </Badge>
                    ) : a.status === "SUBMITTED" ? (
                      <span className="text-xs text-muted-foreground">E&apos;lon qilinmagan</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {a.status === "IN_PROGRESS" ? (
                      <Button asChild size="sm" variant="midnight">
                        <Link href={`/exam/${a.id}`}>Davom ettirish</Link>
                      </Button>
                    ) : a.released ? (
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/student/results/${a.id}`}>Batafsil</Link>
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
