import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";
import { formatDateTime, fromLocalInput, toLocalInput } from "@/lib/time";

describe("csv", () => {
  it("maxsus belgilarni qochiradi", () => {
    expect(csvCell('a"b')).toBe('"a""b"');
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell(null)).toBe("");
    expect(toCsv([["a", 1], ["b", 2]])).toBe("a,1\r\nb,2");
  });
  it("formula injection'dan himoyalaydi", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("+998")).toBe("'+998");
  });
});

describe("time (Asia/Tashkent)", () => {
  it("datetime-local qiymatini Toshkent vaqtida talqin qiladi", () => {
    const d = fromLocalInput("2026-10-16T14:30")!;
    expect(d.toISOString()).toBe("2026-10-16T09:30:00.000Z");
    expect(toLocalInput(d)).toBe("2026-10-16T14:30");
    expect(formatDateTime(d)).toBe("16-oktabr, 2026, 14:30");
  });
  it("noto'g'ri qiymatni rad etadi", () => {
    expect(fromLocalInput("2026-13-99")).toBeNull();
    expect(fromLocalInput("")).toBeNull();
  });
});
