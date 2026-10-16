import bcrypt from "bcryptjs";

const ROUNDS = 10; // ommaviy import Vercel vaqt chegarasiga sig'ishi uchun

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
