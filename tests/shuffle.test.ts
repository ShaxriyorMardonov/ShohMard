import { describe, expect, it } from "vitest";
import { seededShuffle } from "@/lib/shuffle";

describe("seededShuffle", () => {
  it("is stable per seed and keeps all items", () => {
    const a = seededShuffle([1, 2, 3, 4], "x");
    expect(seededShuffle([1, 2, 3, 4], "x")).toEqual(a);
    expect([...a].sort()).toEqual([1, 2, 3, 4]);
  });
  it("puts the first item elsewhere for some seeds", () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, i) => seededShuffle([1, 2, 3, 4], "s" + i)[0]));
    expect(firsts.size).toBeGreaterThan(2);
  });
});
