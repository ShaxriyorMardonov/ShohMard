import { SamuLogo } from "@/components/brand/samu-logo";
import { GRADE, gradeKey } from "@/lib/grade";
import { formatDate } from "@/lib/time";
import type { Lang } from "@/i18n/config";
import type { TFunction } from "@/i18n/translate";
import type { Certificate } from "@/server/certificate";
import { SamuSeal } from "./seal";

/** A4 (albom) sertifikat varag'i. */
export function CertificateView({ c, qrSvg, t, lang }: { c: Certificate; qrSvg: string; t: TFunction; lang: Lang }) {
  const grade = t(GRADE[gradeKey(c.percent)].label);
  const org = [
    c.user.university?.name,
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

      <div className="relative flex flex-1 flex-col items-center px-[9%] pt-[5.5%] pb-[4.5%] text-center">
        <SamuLogo size="md" withFullName />
        <h1 className="mt-[2.5%] font-serif text-[clamp(28px,5.2vw,58px)] font-bold tracking-[0.18em] text-midnight">{t("SERTIFIKAT")}</h1>
        <p className="mt-[1%] text-[clamp(11px,1.3vw,15px)] uppercase tracking-[0.25em] text-muted-foreground">{t("Ushbu sertifikat")}</p>
        <p className="mt-[1.6%] border-b-2 border-royal/40 px-8 pb-1 font-serif text-[clamp(22px,3.6vw,40px)] font-bold text-royal">{c.user.fullName}</p>
        {org.length > 0 && <p className="mt-[1.4%] text-[clamp(11px,1.35vw,16px)] text-midnight/80">{org.join(" · ")}</p>}
        <p className="mt-[1.6%] max-w-[80%] text-[clamp(11px,1.45vw,17px)] leading-relaxed">
          {t("«{test}» testini {date} kuni topshirib, quyidagi natijani qayd etgani uchun berildi.", {
            test: c.test.title,
            date: formatDate(c.submittedAt, lang),
          })}
        </p>
        <div className="mt-[2%] grid w-full max-w-[78%] grid-cols-4 overflow-hidden rounded-lg border border-royal/30 text-[clamp(10px,1.2vw,14px)]">
          {[
            [t("Natija"), `${c.percent}%`],
            [t("Ball"), `${c.score}/${c.maxScore}`],
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
            <div className="w-[min(130px,12vw)] print:w-[130px]"><SamuSeal size={130} /></div>
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
