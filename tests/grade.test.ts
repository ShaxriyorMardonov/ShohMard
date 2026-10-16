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
