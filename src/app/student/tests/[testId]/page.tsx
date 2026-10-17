import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock, FileQuestion, Info, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { TestStatusBadge } from "@/components/student/test-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { requireStudent } from "@/lib/auth";
import { RESULT_RELEASE_LABEL } from "@/lib/exam-rules";
import { formatDateTime, formatDuration } from "@/lib/time";
import { getStudentTests } from "@/server/student";
import { StartTestButton } from "./start-button";

export default async function TestIntroPage({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const user = await requireStudent();
  const { t, lang } = await getT();
  const tests = await getStudentTests(user.id, user.university.id);
  const test = tests.find((x) => x.id === testId);
  if (!test) notFound();

  const rules = [
    t("Test boshlangach, taymer to'xtatilmaydi va sahifani yangilash vaqtni qayta boshlamaydi."),
    t("Har bir javobingiz serverga avtomatik saqlanadi."),
    t("Vaqt tugaganda javoblaringiz avtomatik topshiriladi."),
    t("Test davomida boshqa oyna yoki ilovaga o'tish, nusxa olish va testni boshqa qurilmada ochish qayd etiladi va o'qituvchiga ko'rinadi."),
    test.maxAttempts > 1
      ? t("Testni {n} marta topshirish mumkin. Har bir urinish alohida natija sifatida saqlanadi.", { n: test.maxAttempts })
      : t("Testni faqat bir marta topshirish mumkin."),
  ];

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/student/tests">
          <ArrowLeft /> {t("Testlarga qaytish")}
        </Link>
      </Button>
      <PageHeader title={test.title} description={test.subject ?? undefined} actions={<TestStatusBadge status={test.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="grid gap-6 pt-5">
            {test.description && <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{test.description}</p>}
            <div>
              <h2 className="mb-3 font-bold text-midnight">{t("Qoidalar")}</h2>
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
              <span>{t("Davomiyligi:")} <b>{formatDuration(test.durationMinutes, lang)}</b></span>
            </div>
            <div className="flex items-center gap-3">
              <FileQuestion className="size-4 text-royal" />
              <span>{t("Savollar:")} <b>{t("{n} ta", { n: test._count.questions })}</b></span>
            </div>
            {test.maxAttempts > 1 && (
              <div className="flex items-center gap-3">
                <RotateCcw className="size-4 text-royal" />
                <span>{t("Urinishlar:")} <b>{t("{used} / {max}", { used: test.attemptsUsed, max: test.maxAttempts })}</b></span>
              </div>
            )}
            <div className="flex items-start gap-3">
              <CalendarClock className="mt-0.5 size-4 text-royal" />
              <span>
                {formatDateTime(test.startsAt, lang)} — {formatDateTime(test.endsAt, lang)}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 size-4 text-royal" />
              <span>{t("Natija:")} {t(RESULT_RELEASE_LABEL[test.resultRelease]).toLowerCase()}</span>
            </div>
            {test.status === "open" && (
              <Alert variant="warning">
                <Info />
                <span>
                  {t("Test oynasi {date} da yopiladi. Kech boshlasangiz, vaqtingiz shu paytgacha qisqaradi.", { date: formatDateTime(test.endsAt, lang) })}
                </span>
              </Alert>
            )}
            {test.status === "open" || test.status === "in_progress" ? (
              <StartTestButton testId={test.id} resume={test.status === "in_progress"} retake={!!test.attempt && test.status === "open"} />
            ) : test.status === "upcoming" ? (
              <Alert>
                <Info />
                <span>{t("Test {date} da ochiladi.", { date: formatDateTime(test.startsAt, lang) })}</span>
              </Alert>
            ) : test.status === "submitted" ? (
              <Alert variant="success">
                <CheckCircle2 />
                <span>{test.maxAttempts > 1 ? t("Barcha urinishlaringizdan foydalandingiz.") : t("Siz bu testni topshirgansiz.")}</span>
              </Alert>
            ) : (
              <Alert variant="error">
                <Info />
                <span>{t("Test muddati tugagan.")}</span>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
