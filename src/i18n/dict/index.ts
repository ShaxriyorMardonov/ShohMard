import type { Lang } from "../config";
import type { Dict } from "../translate";
import adminOrg from "./admin-org";
import adminTests from "./admin-tests";
import attempts from "./attempts";
import certificates from "./certificates";
import common from "./common";
import live from "./live";
import security from "./security";
import olympiad from "./olympiad";
import messages from "./messages";
import studentExam from "./student-exam";
import wordImport from "./word-import";

/** Har bir bo'lim o'z lug'atini alohida faylda saqlaydi: { ru: {...}, en: {...} }. */
const PARTS: { ru: Dict; en: Dict; "uz-Cyrl"?: Dict }[] = [olympiad, security, certificates, live, wordImport, attempts, messages, studentExam, adminTests, adminOrg, common];

export function dictFor(lang: Lang): Dict {
  if (lang === "uz") return {};
  const out: Dict = {};
  for (const p of PARTS) Object.assign(out, (p as Record<string, Dict | undefined>)[lang] ?? {});
  return out;
}
