/**
 * O'zbek lotin yozuvidan kirill yozuviga o'girish (UI matnlari uchun).
 * {placeholder} qismlari o'zgartirilmaydi.
 */
const APOS = "['ʻʼ’‘`]";
const PAIRS: [RegExp, string][] = [
  [new RegExp(`O${APOS}`, "g"), "Ў"],
  [new RegExp(`o${APOS}`, "g"), "ў"],
  [new RegExp(`G${APOS}`, "g"), "Ғ"],
  [new RegExp(`g${APOS}`, "g"), "ғ"],
  [/SH/g, "Ш"], [/Sh/g, "Ш"], [/sh/g, "ш"],
  [/CH/g, "Ч"], [/Ch/g, "Ч"], [/ch/g, "ч"],
  [/YO/g, "Ё"], [/Yo/g, "Ё"], [/yo/g, "ё"],
  [/YU/g, "Ю"], [/Yu/g, "Ю"], [/yu/g, "ю"],
  [/YA/g, "Я"], [/Ya/g, "Я"], [/ya/g, "я"],
  [/NG/g, "НГ"], [/Ng/g, "Нг"],
];
const SINGLE: Record<string, string> = {
  a: "а", b: "б", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н",
  o: "о", p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", x: "х", y: "й", z: "з", c: "с", w: "в",
};

function word(w: string): string {
  // So'z boshidagi "e" -> "э", "ye" -> "е"
  let s = w.replace(/^E/, "Э").replace(/^e/, "э");
  for (const [re, to] of PAIRS) s = s.replace(re, to);
  s = s.replace(new RegExp(APOS, "g"), "ъ");
  let out = "";
  for (const ch of s) {
    const low = ch.toLowerCase();
    const m = SINGLE[low];
    out += m ? (ch === low ? m : m.toUpperCase()) : ch;
  }
  return out;
}

// Lotin yozuvida qolishi kerak bo'lgan so'zlar (brend, texnik atamalar)
const KEEP = /^(SAMU|Excel|Word|CSV|PDF|HEMIS|Moodle|Smart|Assessment|Modern|University|Asia\/Tashkent|UTC|\.xlsx|\.docx|\.doc|xlsx|docx|doc|ID|URL|A\)|B\)|C\)|D\))$/;

// Rus tilidan o'zlashgan so'zlarda yumshatish belgisi
const FIX: [RegExp, string][] = [
  [/акулт/g, "акульт"], [/АКУЛТ/g, "АКУЛЬТ"],
  [/мпют/g, "мпьют"],
  [/нгли/g, "нгли"],
];

export function toCyrillic(text: string): string {
  let out = text
    .split(/(\{[^}]+\}|[A-Za-zʻʼ'’‘`]+(?:[ʻʼ'’‘`][A-Za-z]+)*)/)
    .map((part) => {
      if (!part || part.startsWith("{")) return part;
      if (!/[A-Za-z]/.test(part) || KEEP.test(part)) return part;
      return word(part);
    })
    .join("");
  for (const [re, to] of FIX) out = out.replace(re, to);
  return out;
}
