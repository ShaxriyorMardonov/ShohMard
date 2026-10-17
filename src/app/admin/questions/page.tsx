import Link from "next/link";
import { TestsTabs } from "@/components/admin/tests-tabs";
import { Library, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Prisma, QuestionType } from "@prisma/client";
import { deleteQuestionAction } from "@/actions/admin";
import { ImportDialog } from "@/components/admin/import-dialog";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUESTION_TYPE_LABEL } from "@/lib/exam-rules";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Savollar banki") };
}
export const maxDuration = 60;
const PER_PAGE = 25;
const TYPES = ["SINGLE", "MULTIPLE", "TRUE_FALSE"] as const;

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; subject?: string; type?: string; page?: string; saved?: string }>;
}) {
  await requireAdmin();
  const { t } = await getT();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const type = TYPES.includes(sp.type as QuestionType) ? (sp.type as QuestionType) : undefined;
  const page = parsePage(sp.page);
  const where: Prisma.QuestionWhereInput = {
    ...(q ? { text: { contains: q, mode: "insensitive" } } : {}),
    ...(sp.subject ? { subject: sp.subject } : {}),
    ...(type ? { type } : {}),
  };
  const [subjects, total, questions] = await Promise.all([
    prisma.question.findMany({ where: { subject: { not: null } }, distinct: ["subject"], select: { subject: true }, orderBy: { subject: "asc" } }),
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { id: true, text: true, type: true, subject: true, _count: { select: { options: true, tests: true } } },
    }),
  ]);

  return (
    <>
      <TestsTabs active="bank" showBank />
      <PageHeader
        title={t("Savollar banki")}
        description={t("Testlarga qo'shiladigan barcha savollar")}
        actions={
          <>
            <ImportDialog kind="questions" />
            <Button asChild><Link href="/admin/questions/new"><Plus /> {t("Yangi savol")}</Link></Button>
          </>
        }
      />
      {sp.saved && <Alert variant="success" className="mb-4"><span>{t("Savol saqlandi.")}</span></Alert>}
      <form className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_200px_auto]" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={t("Savol matni bo'yicha qidirish")} className="pl-9" aria-label={t("Qidirish")} />
        </div>
        <NativeSelect name="subject" defaultValue={sp.subject ?? ""} aria-label={t("Fan")}>
          <option value="">{t("Barcha fanlar")}</option>
          {subjects.map((s) => (
            <option key={s.subject} value={s.subject!}>{s.subject}</option>
          ))}
        </NativeSelect>
        <NativeSelect name="type" defaultValue={type ?? ""} aria-label={t("Turi")}>
          <option value="">{t("Barcha turlar")}</option>
          {TYPES.map((ty) => (
            <option key={ty} value={ty}>{t(QUESTION_TYPE_LABEL[ty])}</option>
          ))}
        </NativeSelect>
        <Button type="submit" variant="midnight">{t("Filtrlash")}</Button>
      </form>
      {questions.length === 0 ? (
        <EmptyState icon={<Library />} title={t("Savollar topilmadi")} description={t("Yangi savol qo'shing yoki filtrni o'zgartiring.")} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Savol")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Turi")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Fan")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Testlarda")}</TableHead>
                <TableHead className="text-right">{t("Amallar")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="max-w-md">
                    <p className="line-clamp-2 font-medium text-midnight">{x.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("{n} ta variant", { n: x._count.options })}
                      <span className="md:hidden"> · {t(QUESTION_TYPE_LABEL[x.type])}{x.subject && ` · ${x.subject}`}</span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="muted">{t(QUESTION_TYPE_LABEL[x.type])}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell">{x.subject ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{x._count.tests}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild size="icon-sm" variant="ghost" aria-label={t("Tahrirlash")}>
                        <Link href={`/admin/questions/${x.id}`}><Pencil /></Link>
                      </Button>
                      <ConfirmAction
                        trigger={<Button size="icon-sm" variant="ghost" className="text-error hover:bg-error/10" aria-label={t("O'chirish")}><Trash2 /></Button>}
                        title={t("Savolni o'chirish")}
                        description={t("Savol savollar bankidan butunlay o'chiriladi.")}
                        confirmLabel={t("O'chirish")}
                        action={deleteQuestionAction.bind(null, x.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={{ q, subject: sp.subject, type }} />
        </Card>
      )}
    </>
  );
}
