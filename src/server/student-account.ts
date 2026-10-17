import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

/** Eski umumiy boshlang'ich parol — endi u bilan kirib bo'lmaydi. */
export const LEGACY_DEFAULT_PASSWORD = "12345678a";

// Adashtiradigan belgilarsiz (0/o, 1/l/i)
const LETTERS = "abcdefghjkmnpqrstuvwxyz";
const DIGITS = "23456789";

/** Har bir talaba uchun tasodifiy boshlang'ich parol: 8 belgi, kamida 2 harf va 2 raqam. */
export function generateInitialPassword(): string {
  for (;;) {
    const all = LETTERS + DIGITS;
    let p = "";
    for (let i = 0; i < 8; i++) p += all[randomInt(all.length)];
    if ((p.match(/[a-z]/g)?.length ?? 0) >= 2 && (p.match(/\d/g)?.length ?? 0) >= 2) return p;
  }
}

/**
 * Boshlang'ich parol xeshi. Parol tasodifiy va bir martalik (birinchi kirishda almashtiriladi),
 * shuning uchun ommaviy import Vercel vaqt chegarasiga sig'ishi uchun yengilroq xesh ishlatiladi.
 */
export function hashInitialPassword(plain: string) {
  return bcrypt.hash(plain, 8);
}

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
