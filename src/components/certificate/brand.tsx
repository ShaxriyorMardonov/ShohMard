import { BRAND } from "@/components/brand/samu-logo";

const GOLD = "#C9A227";

/** Sertifikat uchun SAMU medalyoni: oltin hoshiyali doira ichida belgi. */
function Medallion() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className="size-[clamp(34px,4.6vw,54px)] shrink-0 print:size-[54px]">
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

/** Sertifikat sarlavhasidagi SAMU belgisi: medalyon, serif so'z belgisi va oltin bezak chiziqlari. */
export function CertificateBrand() {
  return (
    <div className="flex w-full items-center justify-center gap-[2.2%]" aria-label={`${BRAND.name} — ${BRAND.fullName}`}>
      <span aria-hidden className="h-px max-w-[20%] flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
      <div className="flex items-center gap-[clamp(8px,1.2vw,16px)]">
        <Medallion />
        <div className="flex flex-col items-start leading-none">
          <span
            className="bg-gradient-to-b from-[#1B2E6E] to-[#315ECA] bg-clip-text font-serif text-[clamp(20px,3vw,36px)] font-bold tracking-[0.3em] text-transparent print:text-[36px]"
            style={{ WebkitPrintColorAdjust: "exact" }}
          >
            SAMU
          </span>
          <span className="mt-[0.35em] flex items-center gap-[0.6em] text-[clamp(7px,0.85vw,10.5px)] font-semibold uppercase tracking-[0.28em] text-midnight/70 print:text-[10.5px]">
            <span style={{ color: GOLD }}>◆</span>
            {BRAND.fullName}
            <span style={{ color: GOLD }}>◆</span>
          </span>
        </div>
      </div>
      <span aria-hidden className="h-px max-w-[20%] flex-1" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
    </div>
  );
}
