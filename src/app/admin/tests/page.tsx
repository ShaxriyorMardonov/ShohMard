import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TEST_STATE_BADGE } from "@/components/admin/test-state";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { testState } from "@/lib/exam-rules";
import { formatDateTime, formatDuration } from "@/lib/time";

export const metadata: Metadata = { title: "Testlar" };


export default async function TestsPage() {
  await requireAdmin();
  const now = new Date();
  const tests = await prisma.test.findMany({
    orderBy: { startsAt: "desc" },
    include: {
      universities: { select: { shortName: true } },
      _count: { select: { questions: true, attempts: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Testlar"
        description="Imtihonlarni yarating, rejalashtiring va universitetlarga biriktiring"
        actions={<Button asChild><Link href="/admin/tests/new"><Plus /> Yangi test</Link></Button>}
      />
      {tests.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="Testlar yo'q" description="Birinchi testni yarating." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Holat</TableHead>
                <TableHead>Vaqt oralig&apos;i</TableHead>
                <TableHead>Davomiylik</TableHead>
                <TableHead>Savollar</TableHead>
                <TableHead>Urinishlar</TableHead>
                <TableHead>Universitetlar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((t) => {
                const st = TEST_STATE_BADGE[testState(t, now)];
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Link href={`/admin/tests/${t.id}`} className="font-semibold text-midnight hover:text-royal">{t.title}</Link>
                      {t.subject && <span className="block text-xs text-muted-foreground">{t.subject}</span>}
                    </TableCell>
                    <TableCell><Badge variant={st.variant}>{st.label}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(t.startsAt)}
                      <br />
                      {formatDateTime(t.endsAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDuration(t.durationMinutes)}</TableCell>
                    <TableCell>{t._count.questions}</TableCell>
                    <TableCell>{t._count.attempts}</TableCell>
                    <TableCell className="text-xs">{t.universities.map((u) => u.shortName).join(", ") || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
