import { Marck_Script, Noto_Serif } from "next/font/google";
import { GRADE, gradeKey, olympiadPlace } from "@/lib/grade";
import { formatDate } from "@/lib/time";
import type { Lang } from "@/i18n/config";
import type { TFunction } from "@/i18n/translate";
import type { Certificate } from "@/server/certificate";
import { SamuMark } from "@/components/brand/samu-logo";
import { SamuSeal } from "./seal";

const script = Marck_Script({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-script", display: "swap" });
const serif = Noto_Serif({ subsets: ["latin", "cyrillic"], weight: ["700", "800"], style: ["normal", "italic"], variable: "--font-dserif", display: "swap" });

const fmt = (v: number | null) => String(Math.round((v ?? 0) * 100) / 100);
const ROMAN = { 1: "I", 2: "II", 3: "III" } as const;

/** O'zbekiston bayrog'i ranglari */
const FLAG = { blue: "#0099B5", white: "#FFFFFF", red: "#CE1126", green: "#1EB53A" };

/** Yon tomonlardagi rangli uchburchaklar (har safar bir xil chiqishi uchun oddiy psevdo-tasodifiy generator). */
function triangles() {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const colors = ["#F4A6B5", "#8EDCD0", "#B9A7E8", "#9CC8F2", "#C9CED8", "#A8E6C1", "#F7C6D9"];
  const out: { d: string; fill: string; o: number }[] = [];
  const S = 15;
  for (let gx = 0; gx < 210 / S; gx++) {
    for (let gy = 0; gy < 297 / S; gy++) {
      const cx = gx * S + S / 2;
      const edge = Math.min(cx, 210 - cx); // markazga yaqin joylar ochiqroq qoladi
      const p = edge < 30 ? 0.75 : edge < 50 ? 0.35 : 0.08;
      if (rnd() > p) continue;
      const x = gx * S, y = gy * S;
      const v = Math.floor(rnd() * 4);
      const pts = [
        [x, y, x + S, y, x, y + S],
        [x + S, y, x + S, y + S, x, y + S],
        [x, y, x + S, y + S, x, y + S],
        [x, y, x + S, y, x + S, y + S],
      ][v];
      out.push({ d: `M${pts[0]} ${pts[1]}L${pts[2]} ${pts[3]}L${pts[4]} ${pts[5]}Z`, fill: colors[Math.floor(rnd() * colors.length)], o: 0.18 + rnd() * 0.3 });
    }
  }
  return out;
}
const TRIS = triangles();

/** Bayroq rangidagi to'lqinli lenta (ko'k, oq — qizil hoshiyali, yashil). */
function FlagRibbon({ d, w }: { d: string; w: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={d} stroke={FLAG.green} strokeWidth={w} transform={`translate(0 ${w * 1.05})`} />
      <path d={d} stroke={FLAG.red} strokeWidth={w * 0.95} />
      <path d={d} stroke={FLAG.white} strokeWidth={w * 0.78} />
      <path d={d} stroke={FLAG.blue} strokeWidth={w} transform={`translate(0 ${-w * 1.05})`} />
      <path d={d} stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth={w * 0.18} transform={`translate(0 ${-w * 1.35})`} />
      <path d={d} stroke="#000000" strokeOpacity="0.08" strokeWidth={w * 0.25} transform={`translate(0 ${w * 1.45})`} />
    </g>
  );
}

function DiplomaDecor() {
  return (
    <svg aria-hidden viewBox="0 0 210 297" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <rect width="210" height="297" fill="#FFFFFF" />
      {TRIS.map((tr, i) => (
        <path key={i} d={tr.d} fill={tr.fill} fillOpacity={tr.o} />
      ))}
      <FlagRibbon d="M-14 16C30 34 76 4 120 9S190 30 226 2" w={4.6} />
      <FlagRibbon d="M-14 262C34 240 86 276 136 256S196 232 226 244" w={6} />
    </svg>
  );
}

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

  return (
    <div
      className={`diploma ${script.variable} ${serif.variable} relative mx-auto flex aspect-[210/297] w-full max-w-[820px] flex-col overflow-hidden bg-white text-[#141A33] shadow-xl [container-type:inline-size] print:max-w-none print:shadow-none`}
    >
      <DiplomaDecor />
      <div className="relative flex flex-1 flex-col items-center px-[10%] pt-[13cqw] pb-[3cqw] text-center">
        <p className="text-[2cqw] font-extrabold uppercase tracking-[0.06em] text-[#141A33]">{t("O'zbekiston Respublikasi Ta'lim va ilm-fan vazirligi")}</p>

        {/* Logotip: belgi + SAMU, ostida qo'lyozma shiori */}
        <div className="mt-[2.4cqw] flex items-center gap-[1.6cqw]">
          <SamuMark size={64} className="size-[8.4cqw] drop-shadow-[0_0.5cqw_0.8cqw_rgba(0,0,0,0.18)]" />
          <div className="text-left leading-none">
            <p className="text-[7.6cqw] font-black tracking-[0.04em] text-[#2B3F9E]" style={{ fontFamily: "var(--font-dserif), Georgia, serif", textShadow: "0 0.3cqw 0 rgba(255,255,255,0.9)" }}>
              SAMU
            </p>
            <p className="mt-[0.6cqw] text-[1.45cqw] font-semibold uppercase tracking-[0.18em] text-[#2B3F9E]/80">Smart Assessment &amp; Modern University</p>
          </div>
        </div>
        <p className="mt-[1.4cqw] text-[3.9cqw] text-[#1D2340]" style={{ fontFamily: "var(--font-script), cursive" }}>
          {intl ? t("Talabalar uchun xalqaro olimpiadalar") : t("Talabalar uchun mahalliy olimpiadalar")}
        </p>

        <h1
          className="mt-[3.4cqw] bg-gradient-to-b from-[#3D86F0] via-[#1E5FD8] to-[#123E9E] bg-clip-text text-[14cqw] font-black uppercase leading-none tracking-[0.02em] text-transparent"
          style={{ filter: "drop-shadow(0 0.5cqw 0.6cqw rgba(18,62,158,0.25))", WebkitTextStroke: "0.25cqw rgba(255,255,255,0.9)", paintOrder: "stroke fill" }}
        >
          {t("Diplom")}
        </h1>

        <p className="mt-[3.4cqw] text-[5.6cqw] leading-none text-[#1D2340]" style={{ fontFamily: "var(--font-script), cursive" }}>
          {t("taqdirlanadi")}
        </p>
        <p className="mt-[3cqw] text-[5cqw] font-bold italic leading-tight text-[#141A33]" style={{ fontFamily: "var(--font-dserif), Georgia, serif" }}>
          {c.user.fullName}
        </p>
        {award && <p className="mt-[2.6cqw] text-[4.2cqw] font-semibold leading-tight text-[#141A33]">{award}</p>}

        <div className="mt-[2.6cqw] grid gap-[0.5cqw] text-[2.8cqw] font-medium leading-snug text-[#1D2340]">
          <p>{olympiadName}</p>
          {c.test.subject && <p>{t("fan: {subject}", { subject: c.test.subject })}</p>}
          <p className="text-[2.2cqw] text-[#3A4366]">
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
          <p className="mt-[2.6cqw] text-[3cqw] font-semibold text-[#141A33]">{t("Ilmiy rahbar: {name}", { name: c.supervisor })}</p>
        )}

        <div className="mt-[2.4cqw] grid gap-[0.3cqw] text-[2.3cqw] leading-snug text-[#1D2340]">
          {org.length > 0 && <p>{org.join(", ")}</p>}
          <p>{t("Diplom raqami")}: <b className="font-bold">{c.number}</b></p>
          <p className="mt-[1cqw] text-[2.5cqw]">{formatDate(c.submittedAt, lang)}</p>
        </div>

        {/* Pastki qism: muhr va QR kod lenta ustida */}
        <div className="mt-auto flex w-full items-end justify-between">
          <div className="flex w-[30%] flex-col items-center">
            <div className="w-[15cqw] rotate-[-8deg] opacity-90 [&_svg]:size-full"><SamuSeal size={140} /></div>
            <p className="mt-[0.6cqw] rounded bg-white/85 px-[1cqw] text-[1.9cqw] font-semibold text-[#141A33]">{t("SAMU platformasi muhri")}</p>
          </div>
          <div className="flex w-[30%] flex-col items-center">
            <div className="rounded-[1.4cqw] bg-white p-[1cqw] shadow-[0_0.5cqw_1.6cqw_rgba(0,0,0,0.15)]">
              <div className="size-[11.5cqw] [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
            <p className="mt-[0.8cqw] rounded bg-white/85 px-[1cqw] text-[1.6cqw] leading-tight text-[#141A33]">{t("Haqiqiyligini tekshirish uchun QR kodni skanerlang")}</p>
          </div>
        </div>
        <div className="mt-[1.6cqw] rounded bg-white/80 px-[1.4cqw] py-[0.4cqw] text-[1.9cqw] font-semibold leading-snug text-[#1D2340]">
          <p>{t("Olimpiada tashkilotchisi: SAMU — Smart Assessment & Modern University platformasi")}</p>
        </div>
      </div>
    </div>
  );
}
