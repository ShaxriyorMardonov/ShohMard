import { GRADE, gradeKey } from "@/lib/grade";
import { isOlympiad } from "@/lib/olympiad";
import { formatDate } from "@/lib/time";
import type { Lang } from "@/i18n/config";
import type { TFunction } from "@/i18n/translate";
import type { Certificate } from "@/server/certificate";
import { CertificateBrand } from "./brand";
import { SamuSeal } from "./seal";

const fmtScore = (v: number | null) => String(Math.round((v ?? 0) * 100) / 100);

/** A4 (albom) sertifikat varag'i. */
export function CertificateView({ c, qrSvg, t, lang }: { c: Certificate; qrSvg: string; t: TFunction; lang: Lang }) {
  const key = gradeKey(c.percent, c.test.kind);
  const grade = t(GRADE[key].label);
  const olympiad = isOlympiad(c.test.kind);
  const intl = c.test.kind === "OLYMPIAD_INTL";
  const olympiadName = intl ? t("«{name}» xalqaro olimpiadasi", { name: c.test.title }) : t("«{name}» mahalliy olimpiadasi", { name: c.test.title });
  // Xalqaro olimpiada sertifikatida universitet, fakultet va guruh ko'rsatilmaydi
  const org = intl ? [] : [
    c.user.university?.name ?? c.user.organization,
    c.user.faculty ? t("{name} fakulteti", { name: c.user.faculty.name }) : null,
    c.user.group ? t("{name} guruhi", { name: c.user.group.name }) : null,
  ].filter(Boolean);
  return (
    <div className="certificate relative mx-auto flex aspect-[297/210] w-full max-w-[1100px] flex-col overflow-hidden bg-white text-midnight shadow-xl print:max-w-none print:shadow-none">
      {/* Bezak ramkalari */}
      <div aria-hidden className="absolute inset-[2.2%] rounded-sm border-[3px] border-midnight" />
      <div aria-hidden className="absolute inset-[3.2%] rounded-sm border border-royal/60" />
      <div aria-hidden className="absolute -right-[8%] -top-[18%] size-[42%] rounded-full bg-royal/[0.06]" />
      <div aria-hidden className="absolute -bottom-[22%] -left-[10%] size-[45%] rounded-full bg-royal/[0.05]" />

      <div className="relative flex flex-1 flex-col items-center px-[9%] pt-[3.4%] pb-[3.2%] text-center">
        <p className="mb-[1%] pl-[0.12em] text-[clamp(11px,1.45vw,17px)] font-bold uppercase tracking-[0.12em] text-midnight print:text-[17px]">
          {t("O'zbekiston Respublikasi Ta'lim va ilm-fan vazirligi")}
        </p>
        <CertificateBrand />
        <h1 className="mt-[1%] pl-[0.18em] font-serif text-[clamp(24px,4.3vw,48px)] font-bold leading-tight tracking-[0.18em] text-midnight">{t("SERTIFIKAT")}</h1>
        {olympiad && <p className="mt-[0.6%] text-[clamp(12px,1.6vw,19px)] font-bold uppercase tracking-[0.12em] text-royal">{olympiadName}</p>}
        <p className="mt-[1%] text-[clamp(11px,1.3vw,15px)] uppercase tracking-[0.25em] text-muted-foreground">{t("Ushbu sertifikat")}</p>
        <p className="mt-[1.1%] border-b-2 border-royal/40 px-8 pb-1 font-serif text-[clamp(20px,3.3vw,36px)] font-bold text-royal">{c.user.fullName}</p>
        {org.length > 0 && <p className="mt-[1%] text-[clamp(11px,1.35vw,16px)] text-midnight/80">{org.join(" · ")}</p>}
        {key === "winner" ? (
          <p className="mt-[1.1%] max-w-[85%] rounded-lg bg-royal px-6 py-[0.7%] font-serif text-[clamp(13px,2vw,23px)] font-bold uppercase tracking-wide text-white">
            {t("«{name}» xalqaro olimpiadasi g'olibi", { name: c.test.title })}
          </p>
        ) : key === "super" ? (
          <p className="mt-[1.1%] max-w-[85%] rounded-lg bg-royal px-6 py-[0.7%] font-serif text-[clamp(13px,2vw,23px)] font-bold text-white">
            {t("Super! Ishtirokingiz bilan tabriklaymiz!")}
          </p>
        ) : olympiad && key !== "fail" ? (
          <p className="mt-[1.1%] max-w-[85%] rounded-lg border-2 border-royal px-6 py-[0.6%] font-serif text-[clamp(12px,1.8vw,21px)] font-bold text-royal">
            {key === "excellent" ? t("Faol ishtirokingiz uchun") : t("Ishtirokingiz uchun")}
          </p>
        ) : null}
        <p className="mt-[1.1%] max-w-[88%] text-[clamp(11px,1.4vw,16px)] leading-normal">
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
        <div className="mt-[1.4%] grid w-full max-w-[78%] grid-cols-4 overflow-hidden rounded-lg border border-royal/30 text-[clamp(10px,1.2vw,14px)]">
          {[
            [t("Natija"), `${c.percent}%`],
            [t("Ball"), `${fmtScore(c.score)}/${fmtScore(c.maxScore)}`],
            [t("To'g'ri javoblar"), `${c.correctCount}/${c.totalQuestions}`],
            [t("Baho"), grade],
          ].map(([k, v], i) => (
            <div key={k} className={`px-2 py-[1.2%] ${i ? "border-l border-royal/30" : ""} ${i === 3 ? "bg-royal text-white" : "bg-royal/[0.04]"}`}>
              <p className={`text-[0.8em] uppercase tracking-wide ${i === 3 ? "text-white/80" : "text-muted-foreground"}`}>{k}</p>
              <p className="text-[1.35em] font-extrabold">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-auto flex w-full items-end justify-between gap-4">
          <div className="flex w-[30%] flex-col items-center">
            <div className="w-[min(104px,9.5vw)] print:w-[104px]"><SamuSeal size={104} /></div>
            <p className="mt-1 text-[clamp(9px,1vw,12px)] text-muted-foreground">{t("SAMU platformasi muhri")}</p>
          </div>
          <div className="w-[36%] text-[clamp(9px,1.05vw,13px)] text-midnight/80">
            <p>{t("Sertifikat raqami")}: <b className="font-mono text-midnight">{c.number}</b></p>
            <p>{t("Berilgan sana")}: <b className="text-midnight">{formatDate(c.submittedAt, lang)}</b></p>
          </div>
          <div className="flex w-[30%] flex-col items-center">
            <div className="size-[min(110px,10vw)] print:size-[110px] [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="mt-1 max-w-[180px] text-[clamp(8px,0.9vw,11px)] leading-tight text-muted-foreground">{t("Haqiqiyligini tekshirish uchun QR kodni skanerlang")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
