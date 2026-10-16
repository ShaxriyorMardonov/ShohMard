import "server-only";
import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db";

/** Har bir yangi talabaga beriladigan boshlang'ich parol (birinchi kirishda almashtiriladi). */
export const DEFAULT_STUDENT_PASSWORD = "12345678a";

/** Bazada band bo'lmagan 7 xonali raqamli loginlar (1000000–9999999). */
export async function generateStudentLogins(count: number): Promise<string[]> {
  const out = new Set<string>();
  while (out.size < count) {
    const batch = new Set<string>();
    while (batch.size < Math.min(count - out.size, 500) * 2) batch.add(String(randomInt(1_000_000, 10_000_000)));
    const taken = new Set(
      (await prisma.user.findMany({ where: { login: { in: [...batch] } }, select: { login: true } })).map((u) => u.login),
    );
    for (const l of batch) {
      if (out.size >= count) break;
      if (!taken.has(l) && !out.has(l)) out.add(l);
    }
  }
  return [...out];
}
