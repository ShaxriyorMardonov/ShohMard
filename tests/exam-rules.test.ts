import { describe, expect, it } from "vitest";
import {
  computeDeadline,
  gradeAttempt,
  isAnswerCorrect,
  isExpired,
  isResultReleased,
  testState,
  validateSelection,
} from "@/lib/exam-rules";

const t0 = new Date("2026-10-16T09:00:00Z");
const window = { isPublished: true, startsAt: t0, endsAt: new Date(t0.getTime() + 2 * 3600_000), durationMinutes: 30 };

describe("testState", () => {
  it("holatlarni to'g'ri aniqlaydi", () => {
    expect(testState({ ...window, isPublished: false }, t0)).toBe("draft");
    expect(testState(window, new Date(t0.getTime() - 1))).toBe("upcoming");
    expect(testState(window, t0)).toBe("open");
    expect(testState(window, window.endsAt)).toBe("closed");
  });
});

describe("computeDeadline", () => {
  it("boshlanish + davomiylik", () => {
    expect(computeDeadline(window, t0).toISOString()).toBe("2026-10-16T09:30:00.000Z");
  });
  it("test oynasi yopilishidan oshmaydi", () => {
    const late = new Date(window.endsAt.getTime() - 10 * 60_000);
    expect(computeDeadline(window, late)).toEqual(window.endsAt);
  });
});

describe("isExpired", () => {
  it("grace oralig'ini hisobga oladi", () => {
    const d = new Date(1000);
    expect(isExpired(d, new Date(1000))).toBe(false);
    expect(isExpired(d, new Date(1001))).toBe(true);
    expect(isExpired(d, new Date(3000), 3000)).toBe(false);
  });
});

describe("isAnswerCorrect", () => {
  it("to'liq moslikni talab qiladi", () => {
    expect(isAnswerCorrect(["a"], ["a"])).toBe(true);
    expect(isAnswerCorrect(["a", "b"], ["b", "a"])).toBe(true);
    expect(isAnswerCorrect(["a"], ["a", "b"])).toBe(false);
    expect(isAnswerCorrect(["a", "b", "c"], ["a", "b"])).toBe(false);
    expect(isAnswerCorrect([], ["a"])).toBe(false);
    expect(isAnswerCorrect(["a", "a"], ["a", "b"])).toBe(false);
    expect(isAnswerCorrect([], [])).toBe(false);
  });
});

describe("gradeAttempt", () => {
  it("ball va foizni hisoblaydi", () => {
    const r = gradeAttempt(
      [
        { questionId: "q1", points: 1, correctOptionIds: ["a"] },
        { questionId: "q2", points: 2, correctOptionIds: ["x", "y"] },
        { questionId: "q3", points: 1, correctOptionIds: ["t"] },
      ],
      new Map([
        ["q1", ["a"]],
        ["q2", ["x"]],
      ]),
    );
    expect(r.score).toBe(1);
    expect(r.maxScore).toBe(4);
    expect(r.correctCount).toBe(1);
    expect(r.percent).toBe(25);
    expect(r.perQuestion.get("q3")).toEqual({ isCorrect: false, points: 0 });
  });
});

describe("validateSelection", () => {
  it("savol turiga qarab tekshiradi", () => {
    expect(validateSelection("SINGLE", ["a"], ["a", "b"])).toBe(true);
    expect(validateSelection("SINGLE", ["a", "b"], ["a", "b"])).toBe(false);
    expect(validateSelection("TRUE_FALSE", ["a", "b"], ["a", "b"])).toBe(false);
    expect(validateSelection("MULTIPLE", ["a", "b"], ["a", "b"])).toBe(true);
    expect(validateSelection("MULTIPLE", ["z"], ["a", "b"])).toBe(false);
    expect(validateSelection("MULTIPLE", ["a", "a"], ["a", "b"])).toBe(false);
    expect(validateSelection("SINGLE", [], ["a"])).toBe(true);
  });
});

describe("isResultReleased", () => {
  const base = { endsAt: window.endsAt, resultsReleasedAt: null };
  it("IMMEDIATE darhol", () => expect(isResultReleased({ ...base, resultRelease: "IMMEDIATE" }, t0)).toBe(true));
  it("AFTER_END test tugagach", () => {
    expect(isResultReleased({ ...base, resultRelease: "AFTER_END" }, t0)).toBe(false);
    expect(isResultReleased({ ...base, resultRelease: "AFTER_END" }, window.endsAt)).toBe(true);
  });
  it("MANUAL faqat e'lon qilinganda", () => {
    expect(isResultReleased({ ...base, resultRelease: "MANUAL" }, window.endsAt)).toBe(false);
    expect(isResultReleased({ ...base, resultRelease: "MANUAL", resultsReleasedAt: t0 }, window.endsAt)).toBe(true);
  });
});
