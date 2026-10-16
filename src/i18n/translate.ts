import type { Lang } from "./config";
import { toCyrillic } from "./translit";

export type Vars = Record<string, string | number | null | undefined>;
export type Dict = Record<string, string>;
export type TFunction = (key: string, vars?: Vars) => string;

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? "") : m));
}

/**
 * Kalit — o'zbek (lotin) matnining o'zi. Rus va ingliz tillari lug'atdan olinadi
 * (topilmasa o'zbekcha qoladi), kirill yozuvi lotindan avtomatik o'giriladi.
 */
export function makeT(lang: Lang, dict: Dict): TFunction {
  return (key, vars) => {
    if (!key) return key;
    if (lang === "uz") return interpolate(key, vars);
    if (lang === "uz-Cyrl") return interpolate(dict[key] ?? toCyrillic(key), vars);
    return interpolate(dict[key] ?? key, vars);
  };
}
