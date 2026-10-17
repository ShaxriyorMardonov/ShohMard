import { describe, expect, it } from "vitest";
import { gradeKey, hasCertificate } from "@/lib/grade";

describe("baho", () => {
  it("chegaralar", () => {
    expect(gradeKey(0)).toBe("fail");
    expect(gradeKey(59.9)).toBe("fail");
    expect(gradeKey(60)).toBe("satisfactory");
    expect(gradeKey(69.9)).toBe("satisfactory");
    expect(gradeKey(70)).toBe("good");
    expect(gradeKey(89.9)).toBe("good");
    expect(gradeKey(90)).toBe("excellent");
    expect(gradeKey(100)).toBe("excellent");
  });
  it("qoniqarsizga sertifikat berilmaydi", () => {
    expect(hasCertificate(59)).toBe(false);
    expect(hasCertificate(60)).toBe(true);
  });
});

describe("olimpiada baholari", () => {
  it("mahalliy: 100% — Super, qolganlari oddiy baho", () => {
    expect(gradeKey(59.9, "OLYMPIAD_LOCAL")).toBe("fail");
    expect(gradeKey(65, "OLYMPIAD_LOCAL")).toBe("satisfactory");
    expect(gradeKey(89, "OLYMPIAD_LOCAL")).toBe("good");
    expect(gradeKey(99, "OLYMPIAD_LOCAL")).toBe("excellent");
    expect(gradeKey(100, "OLYMPIAD_LOCAL")).toBe("super");
    expect(hasCertificate(50, "OLYMPIAD_LOCAL")).toBe(true);
    expect(hasCertificate(100, "OLYMPIAD_LOCAL")).toBe(true);
  });

  it("xalqaro: 100% — g'olib, sertifikat har bir ishtirokchiga", () => {
    expect(gradeKey(100, "OLYMPIAD_INTL")).toBe("winner");
    expect(gradeKey(99, "OLYMPIAD_INTL")).toBe("excellent");
    expect(gradeKey(75, "OLYMPIAD_INTL")).toBe("good");
    expect(gradeKey(65, "OLYMPIAD_INTL")).toBe("satisfactory");
    expect(gradeKey(40, "OLYMPIAD_INTL")).toBe("fail");
    expect(gradeKey(100)).toBe("excellent");
    expect(hasCertificate(10, "OLYMPIAD_INTL")).toBe(true);
    expect(hasCertificate(10)).toBe(false);
  });
});

describe("xalqaro olimpiada o'rinlari", async () => {
  const { olympiadPlace } = await import("@/lib/grade");
  it("25 savoldan 25/24/23 — 1/2/3-o'rin", () => {
    expect(olympiadPlace("OLYMPIAD_INTL", 25, 25)).toBe(1);
    expect(olympiadPlace("OLYMPIAD_INTL", 24, 25)).toBe(2);
    expect(olympiadPlace("OLYMPIAD_INTL", 23, 25)).toBe(3);
    expect(olympiadPlace("OLYMPIAD_INTL", 22, 25)).toBeNull();
    expect(olympiadPlace("OLYMPIAD_LOCAL", 25, 25)).toBeNull();
  });
});
