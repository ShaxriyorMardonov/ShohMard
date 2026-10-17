import { BRAND } from "@/components/brand/samu-logo";

import { GOLD } from "./ornaments";

/** Sertifikat uchun SAMU medalyoni: oltin hoshiyali doira ichida belgi. */
function Medallion() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="size-[4.6cqw] shrink-0 drop-shadow-[0_0.3cqw_0.5cqw_rgba(11,31,99,0.25)]">
      <defs>
        <linearGradient id="cert-medal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3D6FE6" />
          <stop offset="1" stopColor="#14245E" />
        </linearGradient>
        <linearGradient id="cert-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1D27A" />
          <stop offset="0.5" stopColor={GOLD} />
          <stop offset="1" stopColor="#9A7714" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#cert-gold)" />
      <circle cx="50" cy="50" r="43.5" fill="url(#cert-medal)" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="1.5 3" />
      {/* Markazda — buklangan burchakli varaq va belgi (✓) */}
      <g transform="translate(31 31) scale(0.95)">
        <path d="M10 0H27.5L40 12.5V30C40 35.523 35.523 40 30 40H10C4.477 40 0 35.523 0 30V10C0 4.477 4.477 0 10 0Z" fill="#FFFFFF" />
        <path d="M27.5 0V8.5C27.5 10.709 29.291 12.5 31.5 12.5H40L27.5 0Z" fill={GOLD} />
        <path d="M10.5 21.5L17 28L29.5 15.5" stroke="#315ECA" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
    </svg>
  );
}

/** Bezak chizig'i: chetga qarab so'nadigan oltin chiziq va ichki uchida romb. */
function Rule({ side }: { side: "left" | "right" }) {
  return (
    <span aria-hidden className={`flex flex-1 items-center gap-[0.8cqw] ${side === "left" ? "" : "flex-row-reverse"}`}>
      <span className="h-[0.12cqw] flex-1" style={{ background: `linear-gradient(to ${side === "left" ? "right" : "left"}, transparent, ${GOLD})` }} />
      <span className="size-[0.75cqw] rotate-45" style={{ background: GOLD }} />
    </span>
  );
}

/**
 * Sertifikat sarlavhasidagi SAMU belgisi — markazga tekislangan:
 * oltin chiziqlar orasida medalyon, ostida serif "SAMU" va to'liq nomi.
 * Harf oralig'i (tracking) oxirgi harfdan keyin ham bo'sh joy qo'shadi, shuning uchun
 * chap tomonga xuddi shuncha padding berilib, yozuv aniq markazda turadi.
 */
export function CertificateBrand() {
  return (
    <div className="flex w-full flex-col items-center" aria-label={`${BRAND.name} — ${BRAND.fullName}`}>
      <div className="flex w-[52%] items-center gap-[1.2cqw]">
        <Rule side="left" />
        <Medallion />
        <Rule side="right" />
      </div>
      <span className="cert-serif mt-[0.5cqw] pl-[0.28em] text-[3.1cqw] font-extrabold leading-none tracking-[0.28em] text-[#0B2A7A]">SAMU</span>
      <span className="mt-[0.6cqw] pl-[0.3em] text-[0.9cqw] font-semibold uppercase leading-none tracking-[0.3em] text-[#1B2B55]/80">
        {BRAND.fullName}
      </span>
    </div>
  );
}
