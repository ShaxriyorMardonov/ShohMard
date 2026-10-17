import { notFound } from "next/navigation";
import { UsersRound } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/admin/filter-bar";
import { OlympiadTabs } from "@/components/admin/olympiad-tabs";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { UserActiveSwitch } from "@/components/admin/user-active-switch";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OLYMPIAD_KINDS, parseOlympiadSlug } from "@/lib/olympiad";
import { formatDateTime } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Ishtirokchilar") };
}
const PER_PAGE = 30;

/** Olimpiadaga o'zi ro'yxatdan o'tgan ishtirokchilar (ikkala olimpiada uchun umumiy ro'yxat). */
export default async function ParticipantsPage({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const slug = parseOlympiadSlug((await params).kind);
  if (!slug) notFound();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = parsePage(sp.page);
  const where: Prisma.UserWhereInput = {
    roles: { has: "PARTICIPANT" },
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { login: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { organization: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        fullName: true,
        login: true,
        phone: true,
        organization: true,
        isActive: true,
        createdAt: true,
        _count: { select: { attempts: { where: { test: { kind: { in: OLYMPIAD_KINDS } } } } } },
      },
    }),
  ]);
  return (
    <>
      <OlympiadTabs slug={slug} active="participants" />
      <PageHeader
        title={t("Ro'yxatdan o'tgan ishtirokchilar")}
        description={t("Jami {n} ta. Tizimdagi talabalar ham olimpiadalarda o'z logini bilan qatnashadi.", { n: total })}
      />
      <FilterBar search={{ placeholder: t("Ism, login, telefon yoki muassasa") }} values={sp} fields={[]} />
      {users.length === 0 ? (
        <EmptyState icon={<UsersRound />} title={t("Ishtirokchilar topilmadi")} description={t("Ishtirokchilar kirish sahifasidagi \"Olimpiadaga ro'yxatdan o'tish\" havolasi orqali ro'yxatdan o'tadi.")} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("F.I.Sh.")}</TableHead>
                  <TableHead>{t("Login")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("Telefon")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("O'quv muassasasi")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("Ro'yxatdan o'tgan")}</TableHead>
                  <TableHead className="text-center">{t("Urinishlar")}</TableHead>
                  <TableHead className="text-right">{t("Faol")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-semibold text-midnight">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{[u.phone, u.organization].filter(Boolean).join(" · ")}</p>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{u.login}</TableCell>
                    <TableCell className="hidden md:table-cell">{u.phone ?? "—"}</TableCell>
                    <TableCell className="hidden max-w-[260px] truncate md:table-cell">{u.organization ?? "—"}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDateTime(u.createdAt, lang)}</TableCell>
                    <TableCell className="text-center">{u._count.attempts}</TableCell>
                    <TableCell className="text-right"><UserActiveSwitch id={u.id} active={u.isActive} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={{ q: sp.q }} />
        </Card>
      )}
    </>
  );
}
