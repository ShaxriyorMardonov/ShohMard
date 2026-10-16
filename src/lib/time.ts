/**
 * Platforma O'zbekiston vaqti (Asia/Tashkent, UTC+05:00, yozgi vaqt yo'q) bilan ishlaydi.
 * Administrator kiritgan sana-vaqtlar shu mintaqada talqin qilinadi.
 */
export const TZ = "Asia/Tashkent";
const OFFSET = "+05:00";
const OFFSET_MS = 5 * 60 * 60 * 1000;

import type { Lang } from "@/i18n/config";

const MONTHS: Record<Lang, string[]> = {
  uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  "uz-Cyrl": ["январ", "феврал", "март", "апрел", "май", "июн", "июл", "август", "сентабр", "октабр", "ноябр", "декабр"],
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

function dayMonth(p: { d: number; m: number }, lang: Lang) {
  const name = MONTHS[lang][p.m];
  if (lang === "ru") return `${p.d} ${name}`;
  if (lang === "en") return `${name} ${p.d}`;
  return `${p.d}-${name}`;
}

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

/** "16-oktabr, 2026, 14:30" (tilga qarab) */
export function formatDateTime(date: Date | string | null | undefined, lang: Lang = "uz") {
  if (!date) return "—";
  const p = parts(new Date(date));
  return `${dayMonth(p, lang)}, ${p.y}, ${pad(p.h)}:${pad(p.min)}`;
}

export function formatDate(date: Date | string | null | undefined, lang: Lang = "uz") {
  if (!date) return "—";
  const p = parts(new Date(date));
  return `${dayMonth(p, lang)}, ${p.y}`;
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

const UNITS: Record<Lang, [string, string]> = {
  uz: ["soat", "daqiqa"],
  "uz-Cyrl": ["соат", "дақиқа"],
  ru: ["ч", "мин"],
  en: ["h", "min"],
};

export function formatDuration(minutes: number, lang: Lang = "uz") {
  const [hu, mu] = UNITS[lang];
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h} ${hu} ${m} ${mu}`;
  if (h) return `${h} ${hu}`;
  return `${m} ${mu}`;
}
