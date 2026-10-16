import type { Lang } from "../config";
import type { Dict } from "../translate";
import common from "./common";

/** Har bir bo'lim o'z lug'atini alohida faylda saqlaydi: { ru: {...}, en: {...} }. */
const PARTS: { ru: Dict; en: Dict; "uz-Cyrl"?: Dict }[] = [common];

export function dictFor(lang: Lang): Dict {
  if (lang === "uz") return {};
  const out: Dict = {};
  for (const p of PARTS) Object.assign(out, (p as Record<string, Dict | undefined>)[lang] ?? {});
  return out;
}
