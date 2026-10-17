/**
 * Sertifikat bezaklari: burchakdagi ko'k-oltin to'lqinlar, oltin ramka, fon chiziqlari,
 * dafna shoxi va lenta. Hammasi SVG — chop etishda va PDFda aniq chiqadi.
 */

export const GOLD = "#C9A227";
const NAVY = "#0B1F63";
const BLUE = "#1F4FC4";

/** Butun varaq ustidagi bezak qatlami (297×210 — A4 albom, mm). */
export function CertificateDecor() {
  const arcs = Array.from({ length: 14 }, (_, i) => 40 + i * 9);
  return (
    <svg aria-hidden viewBox="0 0 297 210" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <linearGradient id="cd-navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1A3FA8" />
          <stop offset="1" stopColor={NAVY} />
        </linearGradient>
        <linearGradient id="cd-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F7FE8" />
          <stop offset="1" stopColor={BLUE} />
        </linearGradient>
        <linearGradient id="cd-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3D886" />
          <stop offset="0.5" stopColor={GOLD} />
          <stop offset="1" stopColor="#9A7714" />
        </linearGradient>
        <radialGradient id="cd-bg" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#EEF2FA" />
        </radialGradient>
      </defs>

      <rect width="297" height="210" fill="url(#cd-bg)" />
      {/* Fondagi nozik giloshe chiziqlari */}
      <g fill="none" stroke="#2D4FA8" strokeOpacity="0.05" strokeWidth="0.25">
        {arcs.map((r) => (
          <circle key={`r${r}`} cx="330" cy="70" r={r} />
        ))}
        {arcs.map((r) => (
          <circle key={`l${r}`} cx="-35" cy="150" r={r} />
        ))}
      </g>

      {/* Burchak to'lqinlari: chap-yuqori va o'ng-past (180° burilgan nusxa) */}
      {[0, 180].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 148.5 105)`}>
          <g transform={`scale(${deg ? 0.76 : 0.84})`}>
          <path d="M0 0H80C52 8 24 26 0 64Z" fill="url(#cd-navy)" />
          <path d="M86 0C57 9 26 30 0 71" fill="none" stroke="url(#cd-gold)" strokeWidth="1.6" />
          <path d="M0 0H62C40 6 17 19 0 46Z" fill="url(#cd-blue)" />
          <path d="M68 0C44 7 19 22 0 52" fill="none" stroke="url(#cd-gold)" strokeWidth="0.7" />
          <path d="M0 0H40C26 3 10 12 0 30Z" fill="#FFFFFF" fillOpacity="0.14" />
          </g>
        </g>
      ))}

      {/* Oltin qo'sh ramka */}
      <rect x="6" y="6" width="285" height="198" fill="none" stroke="url(#cd-gold)" strokeWidth="0.7" />
      <rect x="7.6" y="7.6" width="281.8" height="194.8" fill="none" stroke={GOLD} strokeOpacity="0.7" strokeWidth="0.25" />
      {/* Burchak naqshlari */}
      {[
        [6, 6, 1, 1],
        [291, 6, -1, 1],
        [6, 204, 1, -1],
        [291, 204, -1, -1],
      ].map(([x, y, sx, sy]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke="url(#cd-gold)" strokeWidth="0.6">
          <path d="M1.6 12V1.6H12" />
          <path d="M3.2 3.2h3.2v3.2h-3.2z" />
        </g>
      ))}
    </svg>
  );
}

/** Dafna shoxi (oltin). `flip` — o'ng tomon uchun ko'zgu nusxa. */
export function Laurel({ flip = false, className }: { flip?: boolean; className?: string }) {
  const leaves = Array.from({ length: 6 }, (_, i) => {
    const t = i / 5;
    const x = 22 - 12 * Math.sin(t * Math.PI * 0.85);
    const y = 70 - t * 58;
    const ang = -35 - t * 40;
    return { x, y, ang };
  });
  return (
    <svg aria-hidden viewBox="0 0 40 80" className={className} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <defs>
        <linearGradient id="laurel-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6DE90" />
          <stop offset="1" stopColor="#B68A16" />
        </linearGradient>
      </defs>
      <path d="M24 76C10 58 8 32 18 8" fill="none" stroke="url(#laurel-g)" strokeWidth="2" strokeLinecap="round" />
      {leaves.map(({ x, y, ang }, i) => (
        <g key={i}>
          <ellipse cx={x - 6} cy={y} rx="7" ry="3" transform={`rotate(${ang} ${x} ${y})`} fill="url(#laurel-g)" />
          <ellipse cx={x + 6} cy={y - 3} rx="6.5" ry="2.8" transform={`rotate(${ang + 70} ${x} ${y})`} fill="url(#laurel-g)" />
        </g>
      ))}
    </svg>
  );
}

/** Lenta: uchlari o'tkir ko'k tasma, oltin hoshiya bilan. */
export function RibbonShape() {
  return (
    <svg aria-hidden viewBox="0 0 100 20" preserveAspectRatio="none" className="absolute inset-0 size-full">
      <defs>
        <linearGradient id="rb-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F3D886" />
          <stop offset="0.5" stopColor={GOLD} />
          <stop offset="1" stopColor="#9A7714" />
        </linearGradient>
        <linearGradient id="rb-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2F63DA" />
          <stop offset="0.55" stopColor="#1D46B4" />
          <stop offset="1" stopColor={NAVY} />
        </linearGradient>
      </defs>
      <polygon points="0,10 4,0 96,0 100,10 96,20 4,20" fill="url(#rb-gold)" />
      <polygon points="1.3,10 4.8,1.3 95.2,1.3 98.7,10 95.2,18.7 4.8,18.7" fill="url(#rb-blue)" />
      <polygon points="4.8,1.3 95.2,1.3 96.5,4.5 3.5,4.5" fill="#FFFFFF" fillOpacity="0.12" />
    </svg>
  );
}

/** Ingichka oltin chiziq, o'rtasida romb. */
export function GoldDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`flex items-center gap-[0.6cqw] ${className ?? ""}`}>
      <span className="h-px flex-1" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
      <span className="size-[0.8cqw] rotate-45" style={{ background: GOLD }} />
      <span className="h-px flex-1" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
    </div>
  );
}
