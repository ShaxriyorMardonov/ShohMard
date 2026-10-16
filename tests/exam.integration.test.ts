import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const enabled = !!process.env.TEST_DATABASE_URL;

describe.skipIf(!enabled)("imtihon jarayoni (PostgreSQL bilan integratsion)", async () => {
  const { prisma } = await import("@/lib/db");
  const exam = await import("@/server/exam");

  let uniA: string, uniB: string, alice: string, bob: string, carol: string, testId: string;
  const q: Record<string, { id: string; correct: string[]; wrong: string[] }> = {};

  async function reset() {
    await prisma.answer.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.testQuestion.deleteMany();
    await prisma.questionOption.deleteMany();
    await prisma.question.deleteMany();
    await prisma.test.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.university.deleteMany();
  }

  beforeAll(async () => {
    await reset();
    uniA = (await prisma.university.create({ data: { name: "A universiteti", shortName: "A" } })).id;
    uniB = (await prisma.university.create({ data: { name: "B universiteti", shortName: "B" } })).id;
    const mk = (login: string, universityId: string) =>
      prisma.user.create({ data: { login, fullName: login, passwordHash: "x", role: "STUDENT", universityId } });
    alice = (await mk("alice", uniA)).id;
    bob = (await mk("bob", uniA)).id;
    carol = (await mk("carol", uniB)).id;

    const create = async (key: string, type: "SINGLE" | "MULTIPLE" | "TRUE_FALSE", opts: [string, boolean][]) => {
      const created = await prisma.question.create({
        data: { text: key, type, options: { create: opts.map(([text, isCorrect], i) => ({ text, isCorrect, position: i })) } },
        include: { options: true },
      });
      q[key] = {
        id: created.id,
        correct: created.options.filter((o) => o.isCorrect).map((o) => o.id),
        wrong: created.options.filter((o) => !o.isCorrect).map((o) => o.id),
      };
    };
    await create("single", "SINGLE", [["a", true], ["b", false], ["c", false]]);
    await create("multi", "MULTIPLE", [["x", true], ["y", true], ["z", false]]);
    await create("tf", "TRUE_FALSE", [["T", false], ["F", true]]);
  });

  beforeEach(async () => {
    await prisma.answer.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.testQuestion.deleteMany();
    await prisma.test.deleteMany();
    const now = Date.now();
    const t = await prisma.test.create({
      data: {
        title: "T",
        durationMinutes: 10,
        startsAt: new Date(now - 60_000),
        endsAt: new Date(now + 3600_000),
        isPublished: true,
        resultRelease: "AFTER_END",
        universities: { connect: [{ id: uniA }] },
        questions: {
          create: [
            { questionId: q.single!.id, position: 0, points: 1 },
            { questionId: q.multi!.id, position: 1, points: 2 },
            { questionId: q.tf!.id, position: 2, points: 1 },
          ],
        },
      },
    });
    testId = t.id;
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it("boshqa universitet talabasi testni boshlay olmaydi", async () => {
    await expect(exam.startAttempt(carol, uniB, testId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("qayta boshlash muddatni yangilamaydi (refresh tiklanishi)", async () => {
    const a1 = await exam.startAttempt(alice, uniA, testId);
    await new Promise((r) => setTimeout(r, 30));
    const a2 = await exam.startAttempt(alice, uniA, testId);
    expect(a2.id).toBe(a1.id);
    expect(a2.deadlineAt.getTime()).toBe(a1.deadlineAt.getTime());
  });

  it("parallel boshlash bitta urinish yaratadi", async () => {
    const res = await Promise.all([1, 2, 3, 4].map(() => exam.startAttempt(alice, uniA, testId)));
    expect(new Set(res.map((r) => r.id)).size).toBe(1);
    expect(await prisma.attempt.count({ where: { testId, userId: alice } })).toBe(1);
  });

  it("javoblar saqlanadi, yangilanadi va server tomonida baholanadi", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    await exam.saveAnswer(alice, { attemptId: a.id, questionId: q.single!.id, selectedOptionIds: [q.single!.wrong[0]!], flagged: true });
    await exam.saveAnswer(alice, { attemptId: a.id, questionId: q.single!.id, selectedOptionIds: q.single!.correct, flagged: false });
    await exam.saveAnswer(alice, { attemptId: a.id, questionId: q.multi!.id, selectedOptionIds: q.multi!.correct, flagged: false });
    await exam.saveAnswer(alice, { attemptId: a.id, questionId: q.tf!.id, selectedOptionIds: q.tf!.wrong, flagged: false });

    const view = await exam.getExamView(alice, a.id);
    expect(view!.answers).toHaveLength(3);
    expect(view!.answers.find((x) => x.questionId === q.single!.id)!.flagged).toBe(false);

    await exam.submitAttempt(alice, a.id);
    const done = await prisma.attempt.findUniqueOrThrow({ where: { id: a.id } });
    expect(done.status).toBe("SUBMITTED");
    expect(done.score).toBe(3);
    expect(done.maxScore).toBe(4);
    expect(done.percent).toBe(75);
    expect(done.correctCount).toBe(2);
    expect(done.autoSubmitted).toBe(false);
  });

  it("imtihon ko'rinishida javob kalitlari yo'q", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    const view = await exam.getExamView(alice, a.id);
    const json = JSON.stringify(view);
    expect(json).not.toContain("isCorrect");
    for (const tq of view!.test.questions) for (const o of tq.question.options) expect(Object.keys(o).sort()).toEqual(["id", "text"]);
  });

  it("boshqa talabaning urinishiga kirish mumkin emas", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    expect(await exam.getExamView(bob, a.id)).toBeNull();
    await expect(
      exam.saveAnswer(bob, { attemptId: a.id, questionId: q.single!.id, selectedOptionIds: q.single!.correct, flagged: false }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(exam.submitAttempt(bob, a.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("noto'g'ri javob formatini rad etadi", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    await expect(
      exam.saveAnswer(alice, { attemptId: a.id, questionId: q.single!.id, selectedOptionIds: [...q.single!.correct, ...q.single!.wrong], flagged: false }),
    ).rejects.toMatchObject({ code: "INVALID" });
    await expect(
      exam.saveAnswer(alice, { attemptId: a.id, questionId: q.single!.id, selectedOptionIds: q.multi!.correct.slice(0, 1), flagged: false }),
    ).rejects.toMatchObject({ code: "INVALID" });
  });

  it("muddat o'tgach saqlash rad etiladi va urinish avtomatik topshiriladi", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    await exam.saveAnswer(alice, { attemptId: a.id, questionId: q.single!.id, selectedOptionIds: q.single!.correct, flagged: false });
    await prisma.attempt.update({ where: { id: a.id }, data: { deadlineAt: new Date(Date.now() - 10_000) } });
    await expect(
      exam.saveAnswer(alice, { attemptId: a.id, questionId: q.tf!.id, selectedOptionIds: q.tf!.correct, flagged: false }),
    ).rejects.toMatchObject({ code: "EXPIRED" });
    const done = await prisma.attempt.findUniqueOrThrow({ where: { id: a.id } });
    expect(done.status).toBe("SUBMITTED");
    expect(done.autoSubmitted).toBe(true);
    expect(done.submittedAt!.getTime()).toBe(done.deadlineAt.getTime());
    expect(done.score).toBe(1);
    await expect(exam.startAttempt(alice, uniA, testId)).rejects.toMatchObject({ code: "ALREADY_SUBMITTED" });
  });

  it("finalizeExpiredAttempts muddati o'tganlarni yakunlaydi", async () => {
    const a = await exam.startAttempt(bob, uniA, testId);
    await prisma.attempt.update({ where: { id: a.id }, data: { deadlineAt: new Date(Date.now() - 60_000) } });
    expect(await exam.finalizeExpiredAttempts()).toBe(1);
    expect((await prisma.attempt.findUniqueOrThrow({ where: { id: a.id } })).status).toBe("SUBMITTED");
  });

  it("parallel yakunlash faqat bir marta baholaydi", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    const res = await Promise.all([1, 2, 3, 4, 5].map(() => exam.finalizeAttempt(a.id, { auto: false })));
    expect(res.filter((r) => !r.alreadyFinalized)).toHaveLength(1);
  });

  it("topshirilgandan keyin javobni o'zgartirib bo'lmaydi", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    await exam.submitAttempt(alice, a.id);
    await expect(
      exam.saveAnswer(alice, { attemptId: a.id, questionId: q.single!.id, selectedOptionIds: q.single!.correct, flagged: false }),
    ).rejects.toMatchObject({ code: "ALREADY_SUBMITTED" });
  });

  it("ochilmagan yoki yopilgan testni boshlab bo'lmaydi", async () => {
    await prisma.test.update({ where: { id: testId }, data: { startsAt: new Date(Date.now() + 3600_000), endsAt: new Date(Date.now() + 7200_000) } });
    await expect(exam.startAttempt(alice, uniA, testId)).rejects.toMatchObject({ code: "NOT_OPEN" });
    await prisma.test.update({ where: { id: testId }, data: { startsAt: new Date(Date.now() - 7200_000), endsAt: new Date(Date.now() - 1000) } });
    await expect(exam.startAttempt(alice, uniA, testId)).rejects.toMatchObject({ code: "NOT_OPEN" });
  });

  it("kech boshlangan urinish muddati test yopilishigacha qisqaradi", async () => {
    const endsAt = new Date(Date.now() + 2 * 60_000);
    await prisma.test.update({ where: { id: testId }, data: { endsAt } });
    const a = await exam.startAttempt(alice, uniA, testId);
    expect(a.deadlineAt.getTime()).toBe(endsAt.getTime());
  });

  it("cheklangan testni faqat ruxsat berilgan talaba boshlaydi", async () => {
    await prisma.test.update({ where: { id: testId }, data: { restrictedAccess: true } });
    await prisma.testAccess.create({ data: { testId, userId: alice } });
    await expect(exam.startAttempt(bob, uniA, testId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const a = await exam.startAttempt(alice, uniA, testId);
    expect(a.status).toBe("IN_PROGRESS");
  });

  it("nofaol testni boshlab bo'lmaydi", async () => {
    await prisma.test.update({ where: { id: testId }, data: { isPublished: false } });
    await expect(exam.startAttempt(alice, uniA, testId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("testni o'chirish natijalarni ham o'chiradi", async () => {
    const a = await exam.startAttempt(alice, uniA, testId);
    await exam.submitAttempt(alice, a.id);
    await prisma.test.delete({ where: { id: testId } });
    expect(await prisma.attempt.count({ where: { id: a.id } })).toBe(0);
  });

  it("har bir talabaga berilgan sondagi savol tushadi va baho jami bahoga moslanadi", async () => {
    await prisma.test.update({ where: { id: testId }, data: { questionsPerAttempt: 2, maxScore: 100 } });
    const a = await exam.startAttempt(alice, uniA, testId);
    expect(a.questionIds).toHaveLength(2);
    const view = await exam.getExamView(alice, a.id);
    expect(view!.test.questions.map((q) => q.question.id).sort()).toEqual([...a.questionIds].sort());
    const other = Object.values(q).find((x) => !a.questionIds.includes(x.id))!;
    await expect(
      exam.saveAnswer(alice, { attemptId: a.id, questionId: other.id, selectedOptionIds: [], flagged: false }),
    ).rejects.toMatchObject({ code: "INVALID" });
    for (const id of a.questionIds) {
      const qq = Object.values(q).find((x) => x.id === id)!;
      await exam.saveAnswer(alice, { attemptId: a.id, questionId: id, selectedOptionIds: qq.correct, flagged: false });
    }
    await exam.submitAttempt(alice, a.id);
    const done = await prisma.attempt.findUniqueOrThrow({ where: { id: a.id } });
    expect(done.maxScore).toBe(100);
    expect(done.score).toBe(100);
    expect(done.totalQuestions).toBe(2);
    await prisma.test.update({ where: { id: testId }, data: { maxScore: 5 } });
    await exam.rescoreTest(testId);
    expect((await prisma.attempt.findUniqueOrThrow({ where: { id: a.id } })).score).toBe(5);
  });
});
