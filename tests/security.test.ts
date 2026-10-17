import { describe, expect, it } from "vitest";
import { base32Encode, totpCode, verifyTotp } from "@/lib/totp";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/recovery-codes";
import { weakPasswordReason } from "@/lib/validation";
import { generateInitialPassword } from "@/server/student-account";

// RFC 6238 test kaliti: ASCII "12345678901234567890"
const SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP (ikki bosqichli tasdiq)", () => {
  it("RFC 6238 test vektorlariga mos", () => {
    expect(SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    expect(totpCode(SECRET, 1)).toBe("287082"); // T=59s
    expect(totpCode(SECRET, Math.floor(1111111109 / 30))).toBe("081804");
    expect(totpCode(SECRET, Math.floor(1234567890 / 30))).toBe("005924");
  });

  it("±1 qadamni qabul qiladi, bitta koddan ikki marta foydalanib bo'lmaydi", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(verifyTotp(SECRET, totpCode(SECRET, step), null, now)).toBe(step);
    expect(verifyTotp(SECRET, totpCode(SECRET, step - 1), null, now)).toBe(step - 1);
    expect(verifyTotp(SECRET, totpCode(SECRET, step - 3), null, now)).toBeNull();
    expect(verifyTotp(SECRET, totpCode(SECRET, step), step, now)).toBeNull();
    expect(verifyTotp(SECRET, "12345", null, now)).toBeNull();
  });
});

describe("zaxira kodlar", () => {
  it("8 ta noyob kod, xesh katta-kichik harf va tirega sezgir emas", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) expect(c).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(hashRecoveryCode(codes[0]!.toUpperCase().replace("-", " "))).toBe(hashRecoveryCode(codes[0]!));
  });
});

describe("parollar", () => {
  it("boshlang'ich parol tasodifiy, 8 belgi, harf va raqam bilan", () => {
    const set = new Set(Array.from({ length: 200 }, generateInitialPassword));
    expect(set.size).toBe(200);
    for (const p of set) {
      expect(p).toHaveLength(8);
      expect(p).toMatch(/[a-z].*[a-z]/);
      expect(p).toMatch(/\d.*\d/);
      expect(p).not.toMatch(/[01ilo]/);
    }
  });

  it("oson topiladigan parollarni rad etadi", () => {
    expect(weakPasswordReason("12345678a", "5001234")).not.toBeNull();
    expect(weakPasswordReason("x5001234y", "5001234")).not.toBeNull();
    expect(weakPasswordReason("aaaa1111", "ali")).not.toBeNull();
    expect(weakPasswordReason("Kitob2026qalam", "ali")).toBeNull();
  });
});
