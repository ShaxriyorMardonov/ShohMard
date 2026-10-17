import { createHash, randomInt } from "node:crypto";

const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

/** 8 ta bir martalik zaxira kod (telefon yo'qolsa kirish uchun), masalan: k7mp-q2xa. */
export function generateRecoveryCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    let s = "";
    for (let i = 0; i < 8; i++) s += CHARS[randomInt(CHARS.length)];
    return `${s.slice(0, 4)}-${s.slice(4)}`;
  });
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase().replace(/[^a-z0-9]/g, "")).digest("hex");
}
