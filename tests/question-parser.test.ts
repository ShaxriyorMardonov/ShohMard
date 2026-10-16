import { describe, expect, it } from "vitest";
import { parseQuestionText } from "@/lib/question-text-parser";

describe("parseQuestionText", () => {
  it("bitta, ko'p javobli va to'g'ri/noto'g'ri savollarni o'qiydi", () => {
    const { questions, errors } = parseQuestionText(`
SAMU test savollari
Fan: Matematika
1. 2 + 2 nechaga teng?
A) 3
*B) 4
C) 5
Izoh: oddiy qo'shish

2) Qaysilari tub son?
A. 2 +
B. 4
C. 13 *
D. 21

3. Yer Quyosh atrofida aylanadi.
A) To‘g‘ri
B) Noto‘g‘ri
Javob: A

Fan: Informatika
4. HTTP qaysi
qatlam protokoli?
a) Ilova
b) Transport
Javob: a
`);
    expect(errors).toEqual([]);
    expect(questions).toHaveLength(4);
    expect(questions[0]).toMatchObject({ type: "SINGLE", subject: "Matematika", explanation: "oddiy qo'shish", text: "2 + 2 nechaga teng?" });
    expect(questions[0]!.options.map((o) => o.isCorrect)).toEqual([false, true, false]);
    expect(questions[1]!.type).toBe("MULTIPLE");
    expect(questions[1]!.options.map((o) => [o.text, o.isCorrect])).toEqual([["2", true], ["4", false], ["13", true], ["21", false]]);
    expect(questions[2]!.type).toBe("TRUE_FALSE");
    expect(questions[2]!.options[0]!.isCorrect).toBe(true);
    expect(questions[3]).toMatchObject({ subject: "Informatika", text: "HTTP qaysi\nqatlam protokoli?" });
  });

  it("xatolarni aniq ko'rsatadi", () => {
    const { errors } = parseQuestionText("1. Savol\nA) x\nB) y\n2. Ikkinchi\nA) bitta");
    expect(errors[0]).toContain("to'g'ri javob belgilanmagan");
    expect(errors[1]).toContain("kamida 2 ta variant");
    expect(parseQuestionText("hech narsa").errors[0]).toContain("savol topilmadi");
  });
});
