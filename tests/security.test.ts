import { describe, expect, it } from "vitest";
import { weakPasswordReason } from "@/lib/validation";
import { generateInitialPassword } from "@/server/student-account";

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
