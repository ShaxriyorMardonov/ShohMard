import { describe, expect, it } from "vitest";

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)("universitet qidiruvi (o'rnatilgan ro'yxat)", async () => {
  delete process.env.GOOGLE_PLACES_API_KEY;
  const { normalizeName, searchUniversities, verifyUniversity } = await import("@/server/university-search");

  it("apostrof variantlari bir xil", () => {
    expect(normalizeName("Farg‘ona  davlat")).toBe(normalizeName("farg'ona davlat"));
  });

  it("o'zbekcha nom bo'yicha topadi, O'zbekiston OTMlari birinchi", async () => {
    const hits = await searchUniversities("samarqand davlat univ");
    expect(hits[0].name).toBe("Sharof Rashidov nomidagi Samarqand davlat universiteti");
    expect(hits[0].ref.startsWith("l:")).toBe(true);
    expect(await searchUniversities("ab")).toEqual([]);
  });

  it("dunyo OTMlari ham bor", async () => {
    const hits = await searchUniversities("Harvard University");
    expect(hits.some((h) => h.name === "Harvard University" && h.country === "US")).toBe(true);
  });

  it("tanlangan nomni serverda qayta tekshiradi", async () => {
    expect(await verifyUniversity("l:Farg‘ona davlat universiteti")).toEqual({ name: "Farg'ona davlat universiteti", country: "UZ" });
    expect(await verifyUniversity("l:Mavjud bo'lmagan universitet")).toBeNull();
    expect(await verifyUniversity("g:abc")).toBeNull();
    expect(await verifyUniversity("Harvard University")).toBeNull();
  });
});
