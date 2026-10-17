import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const sent: { to: string; text: string }[] = [];
vi.mock("@/server/mailer", () => ({
  isMailConfigured: () => true,
  sendMail: async (to: string, _s: string, text: string) => {
    sent.push({ to, text });
    return true;
  },
}));
vi.mock("@/i18n/server", () => ({
  getT: async () => ({ t: (k: string, v?: Record<string, string>) => k.replace(/\{(\w+)\}/g, (_, n) => v?.[n] ?? "") }),
}));

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)("email orqali tasdiqlash kodi (PostgreSQL bilan integratsion)", async () => {
  const { prisma } = await import("@/lib/db");
  const { issueEmailCode, verifyEmailCode } = await import("@/server/email-code");
  let userId: string;
  const lastCode = () => sent.at(-1)!.text.match(/\b\d{6}\b/)![0];

  beforeAll(async () => {
    await prisma.emailCode.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany({ where: { login: "mailadmin" } });
    userId = (await prisma.user.create({ data: { login: "mailadmin", fullName: "Admin", passwordHash: "x", role: "ADMIN", roles: ["ADMIN"] } })).id;
  });
  beforeEach(async () => {
    await prisma.emailCode.deleteMany({ where: { userId } });
    sent.length = 0;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { login: "mailadmin" } });
  });

  it("kod emailga yuboriladi va bir marta ishlaydi", async () => {
    expect(await issueEmailCode(userId, "login", "a@gmail.com", "s1")).toBeNull();
    expect(sent[0]!.to).toBe("a@gmail.com");
    const code = lastCode();
    expect(await verifyEmailCode(userId, "login", code, "s2")).toMatchObject({ ok: false });
    expect(await verifyEmailCode(userId, "login", code, "s1")).toEqual({ ok: true, email: "a@gmail.com" });
    expect(await verifyEmailCode(userId, "login", code, "s1")).toMatchObject({ ok: false });
  });

  it("qayta yuborishda kutish va 5 ta xato urinishdan keyin kod bekor", async () => {
    expect(await issueEmailCode(userId, "login", "a@gmail.com")).toBeNull();
    expect(await issueEmailCode(userId, "login", "a@gmail.com")).toMatch(/yaqinda yuborildi/);
    const code = lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) expect(await verifyEmailCode(userId, "login", wrong)).toEqual({ ok: false, error: "Kod noto'g'ri" });
    expect(await verifyEmailCode(userId, "login", wrong)).toMatchObject({ ok: false, exhausted: true });
    expect(await verifyEmailCode(userId, "login", code)).toMatchObject({ ok: false, exhausted: true });
  });

  it("muddati o'tgan kod qabul qilinmaydi", async () => {
    await issueEmailCode(userId, "verify_email", "b@gmail.com");
    await prisma.emailCode.updateMany({ where: { userId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await verifyEmailCode(userId, "verify_email", lastCode())).toMatchObject({ ok: false, error: "Kod eskirgan. Yangi kod so'rang." });
  });
});
