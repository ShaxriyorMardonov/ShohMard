"use client";

import * as React from "react";
import type { Lang } from "./config";
import { makeT, type Dict, type TFunction } from "./translate";

const Ctx = React.createContext<{ t: TFunction; lang: Lang }>({ t: makeT("uz", {}), lang: "uz" });

export function I18nProvider({ lang, dict, children }: { lang: Lang; dict: Dict; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ t: makeT(lang, dict), lang }), [lang, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Klient komponentlari uchun: const { t, lang } = useT(); */
export function useT() {
  return React.useContext(Ctx);
}
