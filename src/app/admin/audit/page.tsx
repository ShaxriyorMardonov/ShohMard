import { ScrollText } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { FilterBar } from "@/components/admin/filter-bar";
import { Pagination, parsePage } from "@/components/admin/pagination";
import { EmptyState, PageHeader } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getT } from "@/i18n/server";
import { requireAdmin } from "@/lib/auth";
import { AUDIT_ACTIONS, AUDIT_GROUPS } from "@/lib/audit-labels";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Harakatlar jurnali") };
}

const PER_PAGE = 50;
type SP = { q?: string; group?: string; from?: string; to?: string; page?: string };

const day = (v: string | undefined, plus = 0) => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00+05:00`);
  return Number.isNaN(d.getTime()) ? undefined : new Date(d.getTime() + plus * 86_400_000);
};

/** Kim, qachon, qaysi IP'dan nima qildi. Jurnalni o'zgartirib yoki o'chirib bo'lmaydi. */
export default async function AuditPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const { t, lang } = await getT();
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const q = (sp.q ?? "").trim().slice(0, 100);
  const actions = sp.group ? Object.entries(AUDIT_ACTIONS).filter(([, v]) => v.group === sp.group).map(([k]) => k) : null;
  const from = day(sp.from);
  const to = day(sp.to, 1);
  const where: Prisma.AuditLogWhereInput = {
    ...(actions ? { action: { in: actions } } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
    ...(q
      ? {
          OR: [
            { userName: { contains: q, mode: "insensitive" } },
            { userLogin: { contains: q, mode: "insensitive" } },
            { target: { contains: q, mode: "insensitive" } },
            { details: { contains: q, mode: "insensitive" } },
            { ip: { contains: q } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
  ]);

  return (
    <>
      <PageHeader
        title={t("Harakatlar jurnali")}
        description={t("Kim, qachon, qaysi IP manzildan nima qilgani. Jurnalni o'zgartirib yoki o'chirib bo'lmaydi.")}
      />
      <FilterBar
        search={{ placeholder: t("Foydalanuvchi, obyekt yoki IP bo'yicha qidirish") }}
        values={sp}
        fields={[
          { name: "group", label: t("Bo'lim"), all: t("Barcha amallar"), options: AUDIT_GROUPS.map((g) => ({ value: g.value, label: t(g.label) })) },
          { type: "date", name: "from", label: t("Sanadan") },
          { type: "date", name: "to", label: t("Sanagacha") },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText />} title={t("Yozuvlar yo'q")} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">{t("Vaqt")}</TableHead>
                <TableHead>{t("Kim")}</TableHead>
                <TableHead>{t("Amal")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("IP manzil")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const a = AUDIT_ACTIONS[r.action];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap align-top text-xs text-muted-foreground">{formatDateTime(r.createdAt, lang)}</TableCell>
                    <TableCell className="align-top">
                      <span className="font-semibold text-midnight">{r.userName}</span>
                      {r.userLogin && <span className="block font-mono text-xs text-muted-foreground">{r.userLogin}</span>}
                      <span className="block font-mono text-xs text-muted-foreground md:hidden">{r.ip}</span>
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={a?.danger ? "warning" : "muted"}>{a ? t(a.label) : r.action}</Badge>
                      {r.target && <p className="mt-1 text-sm text-midnight">{r.target}</p>}
                      {r.details && <p className="mt-0.5 line-clamp-3 break-all text-xs text-muted-foreground">{r.details}</p>}
                    </TableCell>
                    <TableCell className="hidden align-top font-mono text-xs text-muted-foreground md:table-cell">{r.ip ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} total={total} params={{ q, group: sp.group, from: sp.from, to: sp.to }} />
        </Card>
      )}
    </>
  );
}
