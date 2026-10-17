import { Marck_Script, Noto_Serif } from "next/font/google";
import { GRADE, gradeKey, olympiadPlace } from "@/lib/grade";
import { formatDate } from "@/lib/time";
import type { Lang } from "@/i18n/config";
import type { TFunction } from "@/i18n/translate";
import type { Certificate } from "@/server/certificate";
import { SamuMark } from "@/components/brand/samu-logo";
import { BookDivider, Emblem, FlagGlobe, GlobeCap, IntlDecor, IntlSkyline, LocalDecor, LocalSkyline, LocalWave, NAVY, OrnamentDivider, WorldDots } from "./diploma-art";
import { SamuSeal } from "./seal";

const script = Marck_Script({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-script", display: "swap" });
const serif = Noto_Serif({ subsets: ["latin", "cyrillic"], weight: ["700", "800", "900"], style: ["normal", "italic"], variable: "--font-dserif", display: "swap" });

const fmt = (v: number | null) => String(Math.round((v ?? 0) * 100) / 100);
const ROMAN = { 1: "I", 2: "II", 3: "III" } as const;

/** Olimpiada diplomi — A4 (kitob) varag'i. */
export function DiplomaView({ c, qrSvg, t, lang }: { c: Certificate; qrSvg: string; t: TFunction; lang: Lang }) {
  const intl = c.test.kind === "OLYMPIAD_INTL";
  const key = gradeKey(c.percent, c.test.kind);
  const place = olympiadPlace(c.test.kind, c.correctCount, c.totalQuestions);
  const award = place
    ? place === 1
      ? t("G'olib ({n} o'rin)", { n: ROMAN[place] })
      : t("Sovrindor ({n} o'rin)", { n: ROMAN[place] })
    : key === "super"
      ? t("Super! Ishtirokingiz bilan tabriklaymiz!")
      : key === "excellent" || key === "winner"
        ? t("Faol ishtirokingiz uchun")
        : key === "fail"
          ? null
          : t("Ishtirokingiz uchun");
  const olympiadName = intl ? t("«{name}» xalqaro olimpiadasi", { name: c.test.title }) : t("«{name}» mahalliy olimpiadasi", { name: c.test.title });
  // Xalqaro olimpiadada universitet, fakultet va guruh ko'rsatilmaydi
  const org = intl
    ? []
    : [
        c.user.university?.name ?? c.user.organization,
        c.user.faculty ? t("{name} fakulteti", { name: c.user.faculty.name }) : null,
        c.user.group ? t("{name} guruhi", { name: c.user.group.name }) : null,
      ].filter(Boolean);

  const serifFont = { fontFamily: "var(--font-dserif), Georgia, serif" };
  const scriptFont = { fontFamily: "var(--font-script), cursive" };

  return (
    <div
      className={`diploma ${script.variable} ${serif.variable} relative mx-auto flex aspect-[210/297] w-full max-w-[820px] flex-col overflow-hidden bg-white text-[#0B2A6F] shadow-xl [container-type:inline-size] print:max-w-none print:shadow-none`}
    >
      {intl ? (
        <>
          <IntlDecor />
          <WorldDots />
          <IntlSkyline />
          <FlagGlobe />
        </>
      ) : (
        <>
          <LocalDecor />
          <LocalSkyline />
        </>
      )}
      <div className="relative flex flex-1 flex-col items-center px-[7%] pt-[2.6cqw] pb-[1cqw] text-center">
        <Emblem className="h-[8.8cqw] w-auto drop-shadow-[0_0.3cqw_0.5cqw_rgba(0,0,0,0.15)]" />
        {/* Vazirlik nomi, ikki yonida chiziq */}
        <div className="mt-[0.8cqw] flex w-full items-center justify-center gap-[2cqw]">
          <span aria-hidden className="h-[0.18cqw] w-[9cqw] bg-[#0B2A6F]" />
          <p className="max-w-[46cqw] text-[2.15cqw] font-bold uppercase leading-[1.3] tracking-[0.05em] text-balance text-[#0B2A6F]">
            {t("O'zbekiston Respublikasi Ta'lim va ilm-fan vazirligi")}
          </p>
          <span aria-hidden className="h-[0.18cqw] w-[9cqw] bg-[#0B2A6F]" />
        </div>

        {/* SAMU logotipi */}
        <div className="mt-[1cqw] flex items-center gap-[1.4cqw]">
          <SamuMark size={64} className="size-[7.6cqw] drop-shadow-[0_0.5cqw_0.8cqw_rgba(0,0,0,0.18)]" />
          <div className="text-left leading-none">
            <p className="text-[7.4cqw] font-black tracking-[0.03em]" style={{ ...serifFont, color: NAVY }}>SAMU</p>
            <p className="mt-[0.3cqw] text-[1.3cqw] font-bold uppercase tracking-[0.16em] text-[#0B2A6F]">Smart Assessment &amp; Modern University</p>
          </div>
        </div>

        {intl ? (
          <GlobeCap className="mt-[0.4cqw] h-[17cqw] w-[24cqw]" />
        ) : (
          <>
            <div className="-mb-[2.6cqw] mt-[-2cqw]"><LocalWave /></div>
            <BookDivider className="w-[38cqw]" />
          </>
        )}

        <p className={`${intl ? "mt-[0.4cqw]" : "mt-[1cqw]"} text-[3.8cqw] leading-tight text-[#0B2A6F]`} style={scriptFont}>
          {intl ? t("Talabalar uchun xalqaro olimpiadalar") : t("Talabalar uchun mahalliy olimpiadalar")}
        </p>

        <h1
          className="mt-[0.2cqw] text-[13cqw] font-black uppercase leading-[1.02] tracking-[0.01em]"
          style={
            intl
              ? { ...serifFont, color: "#0E2A78", WebkitTextStroke: "0.35cqw #D4AF37", paintOrder: "stroke fill", filter: "drop-shadow(0 0.5cqw 0.6cqw rgba(8,28,82,0.3))" }
              : {
                  ...serifFont,
                  backgroundImage: "linear-gradient(180deg,#2D5FC4 0%,#0E2E86 55%,#0A1F5E 100%)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                  filter: "drop-shadow(0 0.5cqw 0.6cqw rgba(11,42,111,0.28))",
                }
          }
        >
          {t("Diplom")}
        </h1>
        <OrnamentDivider gold={intl} className="mt-[0.4cqw] w-[62cqw]" />
        <p className="mt-[0.4cqw] text-[4.8cqw] leading-none text-[#0B2A6F]" style={scriptFont}>
          {t("taqdirlanadi")}
        </p>

        <p className="mt-[1.8cqw] text-[5cqw] font-extrabold italic leading-[1.15] text-[#0B2A6F] text-balance" style={serifFont}>
          {c.user.fullName}
        </p>
        {award && <p className="mt-[1.2cqw] text-[3.3cqw] font-semibold leading-tight text-[#0B2A6F]">{award}</p>}

        <div className="mt-[1.2cqw] grid gap-[0.3cqw] leading-snug text-[#0B2A6F]">
          <p className="text-[2.8cqw] font-semibold">{olympiadName}</p>
          {c.test.subject && <p className="text-[2.3cqw]">{t("fan: {subject}", { subject: c.test.subject })}</p>}
          <p className="text-[2cqw] text-[#1E3570]">
            {t("{max} balldan {score} ball · {correct}/{total} to'g'ri javob · baho: {grade}", {
              max: fmt(c.maxScore),
              score: fmt(c.score),
              correct: c.correctCount ?? 0,
              total: c.totalQuestions ?? 0,
              grade: t(GRADE[key].label),
            })}
          </p>
        </div>

        {c.supervisor && (
          <p className="mt-[1.2cqw] text-[2.5cqw] font-semibold text-[#0B2A6F]">{t("Ilmiy rahbar: {name}", { name: c.supervisor })}</p>
        )}

        <div className="mt-[1cqw] grid gap-[0.2cqw] text-[2cqw] leading-snug text-[#0B2A6F]">
          {org.length > 0 && <p>{org.join(", ")}</p>}
          <p>{t("Diplom raqami")}: <b className="font-bold">{c.number}</b></p>
          <p className="mt-[0.3cqw] text-[2.2cqw]">{formatDate(c.submittedAt, lang)}</p>
        </div>

        {/* Pastki qism: muhr va QR kod */}
        <div className={`mt-auto flex w-full items-end justify-between ${intl ? "mb-[5.6cqw]" : "mb-[8.4cqw]"}`}>
          <div className="flex w-[30%] flex-col items-center">
            <div className="aspect-square w-[12cqw] rounded-full bg-white/80 [&_svg]:size-full"><SamuSeal size={140} /></div>
            <p className={`mt-[0.6cqw] rounded px-[1cqw] text-[1.6cqw] font-semibold whitespace-nowrap ${intl ? "bg-[#0B2A6F]/85 text-white" : "bg-white/85 text-[#0B2A6F]"}`}>{t("SAMU platformasi muhri")}</p>
          </div>
          <div className="flex w-[30%] flex-col items-center">
            <div className="rounded-[1.2cqw] bg-white p-[0.9cqw] shadow-[0_0.5cqw_1.6cqw_rgba(0,0,0,0.15)]">
              <div className="size-[9cqw] [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
            <p className={`mt-[0.6cqw] rounded px-[1cqw] text-[1.3cqw] leading-tight ${intl ? "bg-[#0B2A6F]/85 text-white" : "bg-white/85 text-[#0B2A6F]"}`}>{t("Haqiqiyligini tekshirish uchun QR kodni skanerlang")}</p>
          </div>
        </div>
        <p className="absolute inset-x-0 bottom-[1.2cqw] text-center text-[1.6cqw] font-medium leading-snug text-[#0B2A6F]">
          {t("Olimpiada tashkilotchisi: SAMU — Smart Assessment & Modern University platformasi")}
        </p>
      </div>
    </div>
  );
}
