import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "./config";
import { dictFor } from "./dict";
import { makeT, type TFunction } from "./translate";

export const getLang = cache(async (): Promise<Lang> => {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
});

/** Server komponentlari, server amallari va route handlerlar uchun tarjima funksiyasi. */
export const getT = cache(async (): Promise<{ t: TFunction; lang: Lang }> => {
  const lang = await getLang();
  return { t: makeT(lang, dictFor(lang)), lang };
});
