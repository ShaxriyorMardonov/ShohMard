/**
 * Platforma O'zbekiston vaqti (Asia/Tashkent, UTC+05:00, yozgi vaqt yo'q) bilan ishlaydi.
 * Administrator kiritgan sana-vaqtlar shu mintaqada talqin qilinadi.
 */
export const TZ = "Asia/Tashkent";
const OFFSET = "+05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;

const MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

function parts(date: Date) {
  const d = new Date(date.getTime() + OFFSET_MS);
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    h: d.getUTCHours(),
    min: d.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "16-oktabr, 2026, 14:30" */
export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const p = parts(new Date(date));
  return `${p.d}-${MONTHS[p.m]}, ${p.y}, ${pad(p.h)}:${pad(p.min)}`;
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const p = parts(new Date(date));
  return `${p.d}-${MONTHS[p.m]}, ${p.y}`;
}

/** Date -> "YYYY-MM-DDTHH:mm" (datetime-local input qiymati, Toshkent vaqti) */
export function toLocalInput(date: Date | string | null | undefined) {
  if (!date) return "";
  const p = parts(new Date(date));
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.h)}:${pad(p.min)}`;
}

/** "YYYY-MM-DDTHH:mm" (Toshkent vaqti) -> Date */
export function fromLocalInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00${OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} soat ${m} daqiqa`;
  if (h) return `${h} soat`;
  return `${m} daqiqa`;
}
