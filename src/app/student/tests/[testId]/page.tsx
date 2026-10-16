import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock, FileQuestion, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { TestStatusBadge } from "@/components/student/test-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireStudent } from "@/lib/auth";
import { RESULT_RELEASE_LABEL } from "@/lib/exam-rules";
import { formatDateTime, formatDuration } from "@/lib/time";
import { getStudentTests } from "@/server/student";
import { StartTestButton } from "./start-button";

export default async function TestIntroPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const user = await requireStudent();
  const tests = await getStudentTests(user.id, user.university.id);
  const test = tests.find((t) => t.id === testId);
  if (!test) notFound();

  const rules = [
    "Test boshlangach, taymer to'xtatilmaydi va sahifani yangilash vaqtni qayta boshlamaydi.",
    "Har bir javobingiz serverga avtomatik saqlanadi.",
    "Vaqt tugaganda javoblaringiz avtomatik topshiriladi.",
    "Testni faqat bir marta topshirish mumkin.",
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/student/tests">
          <ArrowLeft /> Testlarga qaytish
        </Link>
      </Button>
      <PageHeader title={test.title} description={test.subject ?? undefined} actions={<TestStatusBadge status={test.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="grid gap-6 pt-5">
            {test.description && <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{test.description}</p>}
            <div>
              <h2 className="mb-3 font-bold text-midnight">Qoidalar</h2>
              <ul className="grid gap-2.5">
                {rules.map((r) => (
                  <li key={r} className="flex gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card className="h-fit">
          <CardContent className="grid gap-4 pt-5 text-sm">
            <div className="flex items-center gap-3">
              <Clock className="size-4 text-royal" />
              <span>Davomiyligi: <b>{formatDuration(test.durationMinutes)}</b></span>
            </div>
            <div className="flex items-center gap-3">
              <FileQuestion className="size-4 text-royal" />
              <span>Savollar: <b>{test._count.questions} ta</b></span>
            </div>
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 text-royal" />
              <span>
                {formatDateTime(test.startsAt)} — {formatDateTime(test.endsAt)}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-4 text-royal" />
              <span>Natija: {RESULT_RELEASE_LABEL[test.resultRelease].toLowerCase()}</span>
            </div>
            {test.status === "open" && (
              <Alert variant="warning">
                <Info />
                <span>
                  Test oynasi {formatDateTime(test.endsAt)} da yopiladi. Kech boshlasangiz, vaqtingiz shu paytgacha qisqaradi.
                </span>
              </Alert>
            )}
            {test.status === "open" || test.status === "in_progress" ? (
              <StartTestButton testId={test.id} resume={test.status === "in_progress"} />
            ) : test.status === "upcoming" ? (
              <Alert>
                <Info />
                <span>Test {formatDateTime(test.startsAt)} da ochiladi.</span>
              </Alert>
            ) : test.status === "submitted" ? (
              <Alert variant="success">
                <CheckCircle2 />
                <span>Siz bu testni topshirgansiz.</span>
              </Alert>
            ) : (
              <Alert variant="error">
                <Info />
                <span>Test muddati tugagan.</span>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
