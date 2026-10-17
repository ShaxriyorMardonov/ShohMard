import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { studentOrgWhere, type OrgFilters } from "@/server/filters";

export type ResultFilters = OrgFilters & {
  test?: string;
  subject?: string;
  q?: string;
  status?: string; // "passed" | "failed"
  from?: string; // YYYY-MM-DD (Toshkent)
  to?: string;
};

export const RESULT_FILTER_KEYS = ["q", "test", "subject", "university", "faculty", "group", "form", "status", "from", "to"] as const;

const dayStart = (v: string | undefined, plusDays = 0) => {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  const d = new Date(`${v}T00:00:00+05:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(d.getTime() + plusDays * 86_400_000);
};

export async function resultsWhere(f: ResultFilters): Promise<Prisma.AttemptWhereInput> {
  const q = (f.q ?? "").trim().slice(0, 100);
  const from = dayStart(f.from);
  const to = dayStart(f.to, 1);
  const and: Prisma.AttemptWhereInput[] = [{ status: "SUBMITTED" }];
  if (f.test) and.push({ testId: f.test });
  if (f.subject) and.push({ test: { subject: f.subject === "__none" ? null : f.subject } });
  if (from || to) and.push({ submittedAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } });
  and.push({
    user: {
      ...studentOrgWhere(null, f),
      ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { login: { contains: q, mode: "insensitive" } }] } : {}),
    },
  });
  if (f.status === "passed" || f.status === "failed") {
    // O'tish chegarasi testga bog'liq: har bir chegara qiymati uchun alohida shart
    const thresholds = await prisma.test.findMany({ distinct: ["passingPercent"], select: { passingPercent: true } });
    and.push({
      OR: thresholds.map(({ passingPercent: p }) => ({
        test: { passingPercent: p },
        percent: f.status === "passed" ? { gte: p } : { lt: p },
      })),
    });
  }
  return { AND: and };
}

export const resultSelect = {
  id: true,
  attemptNo: true,
  startedAt: true,
  submittedAt: true,
  autoSubmitted: true,
  score: true,
  maxScore: true,
  percent: true,
  correctCount: true,
  totalQuestions: true,
  tabSwitches: true,
  copyEvents: true,
  deviceChanges: true,
  user: {
    select: {
      fullName: true,
      login: true,
      pinfl: true,
      studyForm: true,
      group: { select: { name: true } },
      faculty: { select: { name: true } },
      university: { select: { name: true, shortName: true } },
    },
  },
  test: { select: { id: true, title: true, subject: true, passingPercent: true } },
} satisfies Prisma.AttemptSelect;
