import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Fakultet va guruhni nomi bo'yicha topadi, yo'q bo'lsa yaratadi.
 * Guruh fakultetga biriktirilmagan bo'lsa, berilgan fakultetga biriktiriladi.
 */
export async function resolveFacultyGroup(
  universityId: string,
  facultyName: string | null | undefined,
  groupName: string | null | undefined,
  tx: Tx = prisma,
): Promise<{ facultyId: string | null; groupId: string | null }> {
  const fName = facultyName?.trim().slice(0, 120) || null;
  const gName = groupName?.trim().slice(0, 40) || null;
  let facultyId: string | null = null;
  if (fName) {
    const f = await tx.faculty.upsert({
      where: { universityId_name: { universityId, name: fName } },
      update: {},
      create: { universityId, name: fName },
      select: { id: true },
    });
    facultyId = f.id;
  }
  let groupId: string | null = null;
  if (gName) {
    const g = await tx.group.upsert({
      where: { universityId_name: { universityId, name: gName } },
      update: {},
      create: { universityId, name: gName, facultyId },
      select: { id: true, facultyId: true },
    });
    groupId = g.id;
    if (facultyId && !g.facultyId) await tx.group.update({ where: { id: g.id }, data: { facultyId } });
    // Fakultet ko'rsatilmagan bo'lsa, guruhning fakultetidan olinadi
    if (!facultyId) facultyId = g.facultyId;
  }
  return { facultyId, groupId };
}

/** Menejer faqat o'z universitetiga tegishli testlarni ko'radi va boshqaradi. */
export function testScopeWhere(scope: string | null): Prisma.TestWhereInput {
  return scope ? { universities: { some: { id: scope }, every: { id: scope } } } : {};
}

export async function canManageTest(scope: string | null, testId: string) {
  const n = await prisma.test.count({ where: { id: testId, ...testScopeWhere(scope) } });
  return n > 0;
}

/** Mavjud test va savol fanlari (yangi test yaratishda taklif sifatida). */
export async function testSubjects(scope: string | null) {
  const [t, q] = await Promise.all([
    prisma.test.findMany({ where: { subject: { not: null }, ...testScopeWhere(scope) }, distinct: ["subject"], select: { subject: true } }),
    prisma.question.findMany({ where: { subject: { not: null } }, distinct: ["subject"], select: { subject: true } }),
  ]);
  return [...new Set([...t, ...q].map((x) => x.subject!))].sort((a, b) => a.localeCompare(b));
}
