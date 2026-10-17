import { GRADE, gradeKey } from "@/lib/grade";
import { isOlympiad } from "@/lib/olympiad";
import { formatDate } from "@/lib/time";
import type { Lang } from "@/i18n/config";
import type { TFunction } from "@/i18n/translate";
import type { Certificate } from "@/server/certificate";
import { Award, Star, Trophy } from "lucide-react";
import { Noto_Serif } from "next/font/google";
import { CertificateBrand } from "./brand";
import { CertificateDecor, GOLD, GoldDivider, Laurel, RibbonShape } from "./ornaments";
import { SamuSeal } from "./seal";

/** Sertifikat sarlavhalari uchun og'ir serif shrift (lotin va kirill). */
const certSerif = Noto_Serif({ subsets: ["latin", "cyrillic"], weight: ["700", "800", "900"], variable: "--font-cert", display: "swap" });

const fmtScore = (v: number | null) => String(Math.round((v ?? 0) * 100) / 100);

/** A4 (albom) sertifikat varag'i. */
export function CertificateView({ c, qrSvg, t, lang }: { c: Certificate; qrSvg: string; t: TFunction; lang: Lang }) {
  const key = gradeKey(c.percent, c.test.kind);
  const grade = t(GRADE[key].label);
  const olympiad = isOlympiad(c.test.kind);
  // Sarlavhada vazirlik ostida talabaning universiteti
  const university = c.user.university?.name ?? c.user.organization;
  const intl = c.test.kind === "OLYMPIAD_INTL";
  const olympiadName = intl ? t("«{name}» xalqaro olimpiadasi", { name: c.test.title }) : t("«{name}» mahalliy olimpiadasi", { name: c.test.title });
  // Xalqaro olimpiada sertifikatida universitet, fakultet va guruh ko'rsatilmaydi
  const org = intl ? [] : [
    c.user.university?.name ?? c.user.organization,
    c.user.faculty ? t("{name} fakulteti", { name: c.user.faculty.name }) : null,
    c.user.group ? t("{name} guruhi", { name: c.user.group.name }) : null,
  ].filter(Boolean);
  const ribbon =
    key === "winner"
      ? t("«{name}» xalqaro olimpiadasi g'olibi", { name: c.test.title })
      : key === "super"
        ? t("Super! Ishtirokingiz bilan tabriklaymiz!")
        : olympiad && key !== "fail"
          ? key === "excellent"
            ? t("Faol ishtirokingiz uchun")
            : t("Ishtirokingiz uchun")
          : null;
  // Uzun matnlar (masalan, ruscha) lenta va baho katagiga sig'ishi uchun shrift o'lchami moslashadi
  const fit = (text: string, max: number, room: number, k: number) => `${Math.min(max, room / (text.length * k)).toFixed(2)}cqw`;
  const stats = [
    { icon: Trophy, label: t("Natija"), value: `${c.percent}%` },
    { icon: Star, label: t("Ball"), value: `${fmtScore(c.score)}/${fmtScore(c.maxScore)}` },
    { icon: Award, label: t("To'g'ri javoblar"), value: `${c.correctCount}/${c.totalQuestions}` },
  ];
  return (
    <div
      className={`certificate ${certSerif.variable} relative mx-auto flex aspect-[297/210] w-full max-w-[1100px] flex-col overflow-hidden bg-white text-[#0B1B4D] shadow-xl [container-type:inline-size] print:max-w-none print:shadow-none`}
    >
      <CertificateDecor />

      <div className="relative flex flex-1 flex-col items-center px-[11%] pt-[3.4cqw] pb-[3cqw] text-center">
        <p className="pl-[0.08em] text-[1.6cqw] font-extrabold uppercase leading-none tracking-[0.08em] text-[#0B1B4D]">
          {t("O'zbekiston Respublikasi Ta'lim va ilm-fan vazirligi")}
        </p>
        {university && (
          <p className="mt-[0.6cqw] pl-[0.06em] text-[1.45cqw] font-bold uppercase leading-none tracking-[0.06em] text-[#1F4FC4]">{university}</p>
        )}
        <div className="mt-[1cqw] w-full"><CertificateBrand /></div>
        <h1
          className="cert-serif mt-[0.8cqw] pl-[0.06em] text-[6.6cqw] font-black uppercase leading-none tracking-[0.06em] text-[#0B1F5C]"
          style={{ textShadow: "0 0.25cqw 0.5cqw rgba(11,31,92,0.18)" }}
        >
          {t("SERTIFIKAT")}
        </h1>
        {olympiad && (
          <div className="mt-[0.6cqw] flex w-full items-center justify-center gap-[1.4cqw]">
            <span aria-hidden className="h-[0.15cqw] w-[6cqw] bg-gradient-to-r from-transparent to-[#1F4FC4]" />
            <p className="text-[1.85cqw] font-extrabold uppercase leading-none tracking-[0.04em] text-[#1F4FC4]">{olympiadName}</p>
            <span aria-hidden className="h-[0.15cqw] w-[6cqw] bg-gradient-to-l from-transparent to-[#1F4FC4]" />
          </div>
        )}
        <p className="mt-[0.8cqw] pl-[0.22em] text-[1.25cqw] uppercase leading-none tracking-[0.22em] text-[#4A5A84]">{t("Ushbu sertifikat")}</p>
        <p className="cert-serif mt-[0.8cqw] text-[4.3cqw] font-extrabold leading-tight text-[#0B1F5C]">{c.user.fullName}</p>
        {org.length > 0 && <p className="mt-[0.2cqw] text-[1.35cqw] leading-tight text-[#2A3A66]">{org.join(" · ")}</p>}
        <GoldDivider className="mt-[0.5cqw] w-[50%]" />
        {ribbon && (
          <div className="relative mt-[1cqw] flex h-[5cqw] min-w-[54%] max-w-[88%] items-center justify-center gap-[1.2cqw] px-[3.8cqw]">
            <RibbonShape />
            <Laurel className="relative h-[3.4cqw] w-[1.8cqw] shrink-0" />
            <p className="cert-serif relative whitespace-nowrap font-extrabold uppercase leading-none tracking-[0.02em] text-white" style={{ fontSize: fit(ribbon, 2, 72, 0.9) }}>
              {ribbon}
            </p>
            <Laurel flip className="relative h-[3.4cqw] w-[1.8cqw] shrink-0" />
          </div>
        )}
        <p className="mt-[1.2cqw] max-w-[94%] text-[1.3cqw] leading-snug text-[#1B2B55]">
          {olympiad
            ? t("{olympiad}da {date} kuni ishtirok etib, {max} balldan {score} ball to'plagani uchun berildi.", {
                olympiad: olympiadName,
                date: formatDate(c.submittedAt, lang),
                score: fmtScore(c.score),
                max: fmtScore(c.maxScore),
              })
            : t("«{test}» testini {date} kuni topshirib, {max} balldan {score} ball to'plagani uchun berildi.", {
                test: c.test.title,
                date: formatDate(c.submittedAt, lang),
                score: fmtScore(c.score),
                max: fmtScore(c.maxScore),
              })}
        </p>
        <div className="mt-[1.3cqw] grid h-[6.1cqw] w-[74%] grid-cols-[1fr_1.15fr_1.25fr_1.1fr] overflow-hidden rounded-[1.1cqw] border border-[#1F4FC4]/35 bg-white/90 shadow-[0_0.4cqw_1.2cqw_rgba(11,31,99,0.12)]">
          {stats.map(({ icon: Icon, label, value }, i) => (
            <div key={label} className={`flex items-center gap-[0.9cqw] px-[1.1cqw] ${i ? "border-l border-[#1F4FC4]/20" : ""}`}>
              <span className="flex size-[3.3cqw] shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#2F63DA] to-[#0B1F63] shadow-[0_0.2cqw_0.4cqw_rgba(11,31,99,0.3)]">
                <Icon className="size-[1.9cqw] text-white" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 text-left leading-none">
                <span className="block text-[0.82cqw] font-semibold uppercase leading-tight tracking-wide text-[#4A5A84]">{label}</span>
                <span className="mt-[0.4cqw] block whitespace-nowrap text-[2cqw] font-extrabold text-[#0B1B4D]">{value}</span>
              </span>
            </div>
          ))}
          <div className="relative flex items-center justify-center gap-[0.8cqw] bg-gradient-to-b from-[#2F63DA] via-[#1D46B4] to-[#0B1F63] text-white">
            {grade.length <= 8 && <Laurel className="h-[4cqw] w-[2cqw] shrink-0" />}
            <span className="leading-none">
              <span className="flex items-center justify-center gap-[0.4cqw] text-[0.9cqw] font-semibold uppercase tracking-wide text-white/85">
                <Star className="size-[1cqw]" fill={GOLD} stroke={GOLD} /> {t("Baho")}
              </span>
              <span className="mt-[0.4cqw] block whitespace-nowrap font-extrabold" style={{ fontSize: fit(grade, 2, 11.5, 0.7) }}>{grade}</span>
            </span>
            {grade.length <= 8 && <Laurel flip className="h-[4cqw] w-[2cqw] shrink-0" />}
          </div>
        </div>

        <div className="mt-auto flex w-full items-end justify-between">
          <div className="flex w-[28%] flex-col items-center pl-[3cqw]">
            <div className="w-[9.2cqw] [&_svg]:size-full"><SamuSeal size={104} /></div>
            <p className="mt-[0.4cqw] text-[1cqw] text-[#2A3A66]">{t("SAMU platformasi muhri")}</p>
          </div>
          <div className="flex w-[36%] flex-col items-center pb-[0.4cqw] text-[1.2cqw] leading-relaxed text-[#2A3A66]">
            <GoldDivider className="mb-[0.8cqw] w-[70%]" />
            <p>{t("Sertifikat raqami")}: <b className="font-extrabold text-[#0B2A7A]">{c.number}</b></p>
            <p>{t("Berilgan sana")}: <b className="font-extrabold text-[#0B2A7A]">{formatDate(c.submittedAt, lang)}</b></p>
          </div>
          <div className="flex w-[28%] flex-col items-center pr-[3cqw]">
            <div className="rounded-[0.8cqw] bg-white p-[0.6cqw] shadow-[0_0.3cqw_1cqw_rgba(11,31,99,0.15)]">
              <div className="size-[7.8cqw] [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            </div>
            <p className="mt-[0.5cqw] max-w-[16cqw] text-[0.9cqw] leading-tight text-[#2A3A66]">{t("Haqiqiyligini tekshirish uchun QR kodni skanerlang")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
