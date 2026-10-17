import { BadgeCheck, UsersRound } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { UserActiveSwitch } from "@/components/admin/user-active-switch";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { OLYMPIAD, OLYMPIAD_KINDS } from "@/lib/olympiad";
import { formatDateTime } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Olimpiada ishtirokchilari") };
}
const PER_PAGE = 30;

type Filters = { q?: string; status?: string; verified?: string; country?: string; test?: string; from?: string; to?: string; page?: string };
const FILTER_KEYS = ["q", "status", "verified", "country", "test", "from", "to"] as const;

const dayStart = (v: string | undefined, plusDays = 0) => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00+05:00`);
  return Number.isNaN(d.getTime()) ? undefined : new Date(d.getTime() + plusDays * 86_400_000);
};

/** Olimpiadalarga o'zi ro'yxatdan o'tgan ishtirokchilar: filtrlar va faollikni boshqarish. */
export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<Filters> }) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = parsePage(sp.page);
  const from = dayStart(sp.from);
  const to = dayStart(sp.to, 1);
  const where: Prisma.UserWhereInput = {
    roles: { has: "PARTICIPANT" },
    ...(sp.status === "active" ? { isActive: true } : sp.status === "inactive" ? { isActive: false } : {}),
    ...(sp.verified === "yes" ? { organizationVerified: true } : sp.verified === "no" ? { organizationVerified: false } : {}),
    ...(sp.country ? { organizationCountry: sp.country === "__none" ? null : sp.country } : {}),
    ...(sp.test === "__none"
      ? { attempts: { none: { test: { kind: { in: OLYMPIAD_KINDS } } } } }
      : sp.test
        ? { attempts: { some: { testId: sp.test } } }
        : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
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
  const [total, activeCount, users, tests, countries] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { AND: [where, { isActive: true }] } }),
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
        organizationVerified: true,
        organizationCountry: true,
        isActive: true,
        createdAt: true,
        _count: { select: { attempts: { where: { test: { kind: { in: OLYMPIAD_KINDS } } } } } },
      },
    }),
    prisma.test.findMany({ where: { kind: { in: OLYMPIAD_KINDS } }, orderBy: { startsAt: "desc" }, select: { id: true, title: true, kind: true } }),
    prisma.user.findMany({
      where: { roles: { has: "PARTICIPANT" }, organizationCountry: { not: null } },
      distinct: ["organizationCountry"],
      select: { organizationCountry: true },
      orderBy: { organizationCountry: "asc" },
    }),
  ]);
  const params: Record<string, string | undefined> = {};
  for (const k of FILTER_KEYS) params[k] = sp[k];
  const kindShort = (k: (typeof tests)[number]["kind"]) => t(Object.values(OLYMPIAD).find((o) => o.kind === k)?.short ?? "");

  return (
    <>
      <PageHeader
        title={t("Olimpiada ishtirokchilari")}
        description={t("Jami {n} ta, faol {a} ta. Tizimdagi talabalar olimpiadalarda o'z logini bilan qatnashadi.", { n: total, a: activeCount })}
      />
      <FilterBar
        search={{ placeholder: t("Ism, login, telefon yoki universitet") }}
        values={sp}
        fields={[
          {
            name: "status",
            label: t("Holat"),
            all: t("Faol va nofaollar"),
            options: [
              { value: "active", label: t("Faqat faollar") },
              { value: "inactive", label: t("Faqat nofaollar") },
            ],
          },
          {
            name: "verified",
            label: t("Universitet"),
            all: t("Tasdiqlangan va tasdiqlanmagan"),
            options: [
              { value: "yes", label: t("Tasdiqlangan universitet") },
              { value: "no", label: t("Qo'lda kiritilgan (tasdiqlanmagan)") },
            ],
          },
          {
            name: "test",
            label: t("Olimpiada"),
            all: t("Barcha olimpiadalar"),
            options: [
              ...tests.map((x) => ({ value: x.id, label: `${x.title} (${kindShort(x.kind)})` })),
              { value: "__none", label: t("Hali qatnashmaganlar") },
            ],
          },
          {
            name: "country",
            label: t("Davlat"),
            all: t("Barcha davlatlar"),
            options: [
              ...countries.map((c) => ({ value: c.organizationCountry!, label: c.organizationCountry! })),
              { value: "__none", label: t("Ko'rsatilmagan") },
            ],
          },
          { type: "date", name: "from", label: t("Sanadan") },
          { type: "date", name: "to", label: t("Sanagacha") },
        ]}
      />
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
                  <TableHead className="hidden md:table-cell">{t("Universitet")}</TableHead>
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
                    <TableCell className="hidden max-w-[300px] md:table-cell">
                      <p className="truncate" title={u.organization ?? undefined}>{u.organization ?? "—"}</p>
                      {u.organization &&
                        (u.organizationVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                            <BadgeCheck className="size-3.5" /> {t("Tasdiqlangan")}
                            {u.organizationCountry && <span className="text-muted-foreground">· {u.organizationCountry}</span>}
                          </span>
                        ) : (
                          <Badge variant="muted" className="text-[11px]">{t("Tasdiqlanmagan")}</Badge>
                        ))}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{formatDateTime(u.createdAt, lang)}</TableCell>
                    <TableCell className="text-center">{u._count.attempts}</TableCell>
                    <TableCell className="text-right"><UserActiveSwitch id={u.id} active={u.isActive} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={params} />
        </Card>
      )}
    </>
  );
}
