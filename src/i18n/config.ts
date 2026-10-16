export const LOCALES = ["uz", "uz-Cyrl", "ru", "en"] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = "uz";
export const LANG_COOKIE = "samu_lang";

export const LANG_LABEL: Record<Lang, string> = {
  uz: "O'zbekcha",
  "uz-Cyrl": "Ўзбекча",
  ru: "Русский",
  en: "English",
};

/** <html lang> qiymati */
export const HTML_LANG: Record<Lang, string> = { uz: "uz-Latn", "uz-Cyrl": "uz-Cyrl", ru: "ru", en: "en" };

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
