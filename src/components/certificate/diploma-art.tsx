/**
 * Olimpiada diplomi bezaklari: mahalliy (milliy naqsh, to'lqinli lenta, Registon) va
 * xalqaro (to'q ko'k-oltin burchaklar, globus, dunyo obidalari) uslublari.
 * Rasmlar public/diploma ichida: globus, nuqtali xarita va bayroqlar.
 */
import { Laurel } from "./ornaments";

export const NAVY = "#0B2A6F";
const GOLD = "#C9A227";

/** Sharqona girih naqshi (8 qirrali yulduzli plitka). */
function GirihPattern({ id, size, color = "#2E6FD0" }: { id: string; size: number; color?: string }) {
  return (
    <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" viewBox="0 0 16 16">
      <rect width="16" height="16" fill="#EAF2FD" />
      <g fill="none" stroke={color} strokeWidth="0.55">
        <rect x="4" y="4" width="8" height="8" fill="#CFE0F8" />
        <rect x="4" y="4" width="8" height="8" transform="rotate(45 8 8)" fill="#CFE0F8" fillOpacity="0.7" />
        <circle cx="8" cy="8" r="1.6" fill="#FFFFFF" />
        <path d="M8 0V2.3M8 13.7V16M0 8H2.3M13.7 8H16M0 0L3.3 3.3M16 0L12.7 3.3M0 16L3.3 12.7M16 16L12.7 12.7" />
        <path d="M0 4L2 2L4 0M12 0L14 2L16 4M16 12L14 14L12 16M4 16L2 14L0 12" strokeOpacity="0.6" />
      </g>
    </pattern>
  );
}

/** To'lqinli lenta: ko'k, oltin hoshiyali oq va to'q ko'k qatlamlar (SAMU ranglari). */
function Ribbon({ d, w }: { d: string; w: number }) {
  return (
    <g fill="none" strokeLinecap="butt">
      <path d={d} stroke="#000000" strokeOpacity="0.07" strokeWidth={w * 3.4} transform={`translate(0 ${w * 0.5})`} />
      <path d={d} stroke={NAVY} strokeWidth={w} transform={`translate(0 ${w * 1.05})`} />
      <path d={d} stroke={GOLD} strokeWidth={w * 1.1} />
      <path d={d} stroke="#FFFFFF" strokeWidth={w * 0.86} />
      <path d={d} stroke="#2F6FD8" strokeWidth={w} transform={`translate(0 ${-w * 1.05})`} />
      <path d={d} stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth={w * 0.2} transform={`translate(0 ${-w * 1.35})`} />
    </g>
  );
}

/* ----------------------------- Mahalliy ----------------------------- */

/** Registon, ko'k gumbazlar va Toshkent teleminorasi siluetlari. */
function UzSkyline() {
  return (
    <svg viewBox="0 0 200 52" preserveAspectRatio="xMidYMax meet" className="block w-full" aria-hidden>
      <defs>
        <linearGradient id="uzs-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8DB8EC" />
          <stop offset="0.75" stopColor="#C9DDF6" />
          <stop offset="1" stopColor="#E9F1FC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="url(#uzs-g)">
        {/* daraxtlar */}
        <circle cx="4" cy="36" r="6" /><circle cx="10" cy="32" r="6" /><circle cx="15" cy="38" r="5" />
        {/* Registon: peshtoq, ravoq, minoralar */}
        <rect x="18" y="22" width="46" height="30" />
        <rect x="28" y="9" width="26" height="43" />
        <rect x="16" y="6" width="4.4" height="46" /><rect x="15.4" y="4.6" width="5.6" height="2" rx="0.6" />
        <rect x="61.6" y="6" width="4.4" height="46" /><rect x="61" y="4.6" width="5.6" height="2" rx="0.6" />
        <rect x="68" y="26" width="14" height="26" />
        <path d="M66.5 27Q66.5 15 75 13Q83.5 15 83.5 27Z" />
        <rect x="84" y="30" width="26" height="22" />
        <path d="M88 31Q88 22 94 20.5Q100 22 100 31Z" />
        <path d="M101 31Q101 25 105 24Q109 25 109 31Z" />
        <rect x="112" y="34" width="22" height="18" />
        <path d="M115 35Q115 28 119.5 27Q124 28 124 35Z" />
        {/* teleminora */}
        <path d="M148.6 52L150 10H151L152.4 52Z" />
        <path d="M144 52L149.5 40H151.5L157 52Z" />
        <ellipse cx="150.5" cy="16" rx="3.2" ry="2.2" />
        <ellipse cx="150.5" cy="21" rx="2.2" ry="1.3" />
        <rect x="150.2" y="1" width="0.6" height="10" />
        {/* o'ng tomondagi gumbazli binolar va daraxtlar */}
        <rect x="160" y="30" width="18" height="22" />
        <path d="M162 31Q162 22 169 20Q176 22 176 31Z" />
        <rect x="179" y="36" width="12" height="16" />
        <circle cx="190" cy="38" r="6" /><circle cx="196" cy="34" r="6" /><circle cx="199" cy="40" r="5" />
      </g>
      {/* ravoq va bezak chiziqlari */}
      <g fill="#FFFFFF" fillOpacity="0.55">
        <path d="M34 52V28Q34 18 41 15.5Q48 18 48 28V52Z" />
        <rect x="20" y="28" width="5" height="7" rx="2.5" /><rect x="20" y="39" width="5" height="7" rx="2.5" />
        <rect x="57" y="28" width="5" height="7" rx="2.5" /><rect x="57" y="39" width="5" height="7" rx="2.5" />
        <rect x="88" y="38" width="4" height="8" rx="2" /><rect x="95" y="38" width="4" height="8" rx="2" /><rect x="102" y="38" width="4" height="8" rx="2" />
        <rect x="164" y="38" width="4" height="8" rx="2" /><rect x="170" y="38" width="4" height="8" rx="2" />
      </g>
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="0.5">
        <path d="M28 12H54M28 14H54M67 22Q75 18 83 22M67.5 24.5Q75 21 82.5 24.5" />
        <path d="M70 15.5L70 27M73 13.5V27M77 13.5V27M80 15.5V27" />
      </g>
    </svg>
  );
}

/** Mahalliy diplom fon qatlami (210×297 mm). */
export function LocalDecor() {
  return (
    <svg aria-hidden viewBox="0 0 210 297" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <linearGradient id="ld-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.6" stopColor="#F5F9FE" />
          <stop offset="1" stopColor="#E7F0FB" />
        </linearGradient>
        <GirihPattern id="ld-girih" size={11} />
        <GirihPattern id="ld-girih-s" size={8} />
        <radialGradient id="ld-fade" cx="0" cy="0" r="1">
          <stop offset="0.25" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#000000" />
        </radialGradient>
        <mask id="ld-corner" maskUnits="userSpaceOnUse" x="0" y="0" width="210" height="297">
          <rect width="62" height="118" fill="url(#ld-fade)" />
        </mask>
      </defs>
      <rect width="210" height="297" fill="url(#ld-bg)" />
      {/* chap-yuqori burchakdagi girih naqshi */}
      <rect width="62" height="118" fill="url(#ld-girih)" mask="url(#ld-corner)" opacity="0.9" />
      <Ribbon d="M-8 52C8 34 26 14 58 -8" w={4.2} />
      {/* pastki lenta va naqshli hoshiya */}
      <Ribbon d="M-10 276C40 270 110 282 220 270" w={2.8} />
      <rect x="0" y="283" width="210" height="8" fill="url(#ld-girih-s)" />
      <path d="M0 283H210M0 291H210" stroke="#1F4FC4" strokeWidth="0.6" />
      <rect x="0" y="291" width="210" height="6" fill="#FFFFFF" />
    </svg>
  );
}

/** SAMU ostidagi to'lqinli lenta. */
export function LocalWave() {
  return (
    <svg aria-hidden viewBox="0 0 210 30" className="block w-[100cqw] max-w-none">
      <Ribbon d="M-6 22C30 30 70 16 110 14S170 10 216 -2" w={4.4} />
    </svg>
  );
}

/** Ochiq kitob belgili ajratgich. */
export function BookDivider({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 12" className={className}>
      <path d="M8 6H48M72 6H112" stroke={NAVY} strokeWidth="0.8" />
      <path d="M4 6l4-1.6v3.2zM116 6l-4-1.6v3.2z" fill={NAVY} />
      <g transform="translate(52 0)">
        <path d="M8 2.6C5.6 1.4 2.6 1.2 0.6 1.8V10.4C2.6 9.8 5.6 10 8 11.2Z" fill="#2F6FD8" />
        <path d="M8 2.6C10.4 1.4 13.4 1.2 15.4 1.8V10.4C13.4 9.8 10.4 10 8 11.2Z" fill="#1A4FB5" />
        <path d="M2 3.4C4 3 6 3.4 7.2 4.2M2 5.4C4 5 6 5.4 7.2 6.2M8.8 4.2C10 3.4 12 3 14 3.4M8.8 6.2C10 5.4 12 5 14 5.4" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="0.45" fill="none" />
        <path d="M0 10.8C3 10.2 6 10.6 8 11.8C10 10.6 13 10.2 16 10.8" stroke={GOLD} strokeWidth="0.7" fill="none" />
      </g>
    </svg>
  );
}

/** "DIPLOM" ostidagi naqshli ajratgich. */
export function OrnamentDivider({ gold = false, className }: { gold?: boolean; className?: string }) {
  const c = gold ? GOLD : NAVY;
  return (
    <svg aria-hidden viewBox="0 0 160 10" className={className}>
      <defs>
        <linearGradient id={`od-l-${gold}`} x1="0" x2="1">
          <stop offset="0" stopColor={c} stopOpacity="0" />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        <linearGradient id={`od-r-${gold}`} x1="1" x2="0">
          <stop offset="0" stopColor={c} stopOpacity="0" />
          <stop offset="1" stopColor={c} />
        </linearGradient>
      </defs>
      <rect x="0" y="4.6" width="66" height="0.8" fill={`url(#od-l-${gold})`} />
      <rect x="94" y="4.6" width="66" height="0.8" fill={`url(#od-r-${gold})`} />
      <g transform="translate(80 5)">
        <path d="M0 -4.4L4.4 0L0 4.4L-4.4 0Z" fill="none" stroke={gold ? GOLD : "#2F6FD8"} strokeWidth="0.8" />
        <path d="M0 -2.2L2.2 0L0 2.2L-2.2 0Z" fill={gold ? GOLD : "#2F6FD8"} />
        <path d="M-12 0Q-8 -3.4 -5 0Q-8 3.4 -12 0ZM12 0Q8 -3.4 5 0Q8 3.4 12 0Z" fill={gold ? GOLD : "#2F6FD8"} fillOpacity="0.85" />
      </g>
    </svg>
  );
}

/** Mahalliy diplomning pastki shahar manzarasi (fon ustida, matn ostida). */
export function LocalSkyline() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[67%] opacity-45">
      <UzSkyline />
    </div>
  );
}

/* ----------------------------- Xalqaro ----------------------------- */

/** Eyfel minorasi, Big-Ben, osmono'par binolar va Kolizey siluetlari. */
function WorldSkyline() {
  return (
    <svg viewBox="0 0 200 52" preserveAspectRatio="xMidYMax meet" className="block w-full" aria-hidden>
      <defs>
        <linearGradient id="ws-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8FB4E6" />
          <stop offset="0.75" stopColor="#CADCF4" />
          <stop offset="1" stopColor="#EEF4FC" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="url(#ws-g)">
        {/* Eyfel minorasi */}
        <path d="M19.4 0.5H20.6L21.4 14L24.6 32L30 52H26.4Q20 40 13.6 52H10L15.4 32L18.6 14Z" />
        <rect x="15.6" y="30.6" width="8.8" height="1.6" />
        <rect x="18" y="13.4" width="4" height="1.2" />
        {/* Big-Ben */}
        <rect x="36" y="14" width="8" height="38" />
        <path d="M35 14L40 2L45 14Z" />
        <rect x="39.7" y="0" width="0.6" height="3" />
        {/* osmono'parlar */}
        <rect x="48" y="24" width="7" height="28" />
        <rect x="56" y="16" width="6" height="36" />
        <path d="M63 52V10L66 6L69 10V52Z" />
        <rect x="70" y="28" width="8" height="24" />
        {/* o'ng tomonda: minora, gumbaz, Kolizey */}
        <rect x="124" y="30" width="10" height="22" />
        <path d="M137.4 52L138.6 4H139.4L140.6 52Z" />
        <ellipse cx="139" cy="14" rx="2.4" ry="1.6" />
        <rect x="142" y="26" width="7" height="26" />
        <path d="M150 52V30Q150 22 158 20Q166 22 166 30V52Z" />
        <path d="M166 52V30Q178 24 196 30V52Z" />
        <rect x="196" y="34" width="6" height="18" />
      </g>
      <g fill="#FFFFFF" fillOpacity="0.55">
        <circle cx="40" cy="18" r="2.2" />
        {[170, 175, 180, 185, 190].map((x) => (
          <g key={x}>
            <rect x={x} y="33" width="3" height="5" rx="1.5" />
            <rect x={x} y="41" width="3" height="5" rx="1.5" />
          </g>
        ))}
        {[50, 52.5, 57.5, 60, 71.5, 74.5].map((x) => (
          <g key={x}>
            <rect x={x} y="28" width="1.2" height="2" />
            <rect x={x} y="34" width="1.2" height="2" />
            <rect x={x} y="40" width="1.2" height="2" />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Xalqaro diplom fon qatlami: to'q ko'k-oltin burchaklar va pastki to'lqin. */
export function IntlDecor() {
  return (
    <svg aria-hidden viewBox="0 0 210 297" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 size-full">
      <defs>
        <linearGradient id="id-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#F3F7FD" />
          <stop offset="1" stopColor="#E3ECF9" />
        </linearGradient>
        <linearGradient id="id-navy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1C3F99" />
          <stop offset="1" stopColor="#081C52" />
        </linearGradient>
        <linearGradient id="id-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E19A" />
          <stop offset="0.5" stopColor={GOLD} />
          <stop offset="1" stopColor="#9A7714" />
        </linearGradient>
      </defs>
      <rect width="210" height="297" fill="url(#id-bg)" />
      {/* yuqori burchaklar */}
      <path d="M150 0H210V48Z" fill="url(#id-navy)" />
      <path d="M140 0L210 56" stroke="url(#id-gold)" strokeWidth="1.6" />
      <path d="M163 0L210 37" stroke="url(#id-gold)" strokeWidth="0.7" />
      <path d="M0 0H42L0 30Z" fill="url(#id-navy)" />
      <path d="M50 0L0 36" stroke="url(#id-gold)" strokeWidth="1.3" />
      {/* yon chiziqlar */}
      <path d="M210 120V297H196Z" fill="url(#id-navy)" opacity="0.92" />
      <path d="M210 112L192 297" stroke="url(#id-gold)" strokeWidth="1" />
      {/* pastki to'lqin */}
      <path d="M0 266C50 288 120 290 210 256V297H0Z" fill="url(#id-navy)" />
      <path d="M0 262C50 284 120 286 210 252" fill="none" stroke="url(#id-gold)" strokeWidth="1.8" />
      <path d="M0 273C60 293 140 291 210 266" fill="none" stroke="url(#id-gold)" strokeWidth="0.6" />
      <rect x="0" y="290" width="210" height="7" fill="#FFFFFF" />
      <path d="M0 290H210" stroke="url(#id-gold)" strokeWidth="0.6" />
    </svg>
  );
}

/** Fon: nuqtali dunyo xaritasi (yuqori qism). */
export function WorldDots() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/diploma/world-dots.png" width={2020} height={1200} alt="" aria-hidden className="pointer-events-none absolute left-[6%] top-[17%] w-[88%] opacity-[0.12]" />
  );
}

/** Globus, bitiruv qalpoqchasi, oltin dafna va ochiq kitob. */
export function GlobeCap({ className }: { className?: string }) {
  return (
    <div aria-hidden className={`relative ${className ?? ""}`}>
      <Laurel className="absolute bottom-[14%] left-[2%] h-[78%] w-[22%]" />
      <Laurel flip className="absolute bottom-[14%] right-[2%] h-[78%] w-[22%]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/diploma/globe.png" width={600} height={600} alt="" className="absolute left-1/2 top-[20%] w-[46%] -translate-x-1/2 drop-shadow-[0_0.6cqw_0.8cqw_rgba(8,28,82,0.3)]" />
      <svg viewBox="0 0 100 80" className="absolute inset-0 size-full">
        {/* qalpoqcha */}
        <path d="M38 17.5V24Q50 28.5 62 24V17.5Z" fill="#0D2160" />
        <path d="M50 6L76 15L50 24L24 15Z" fill="#14307F" />
        <path d="M50 6L76 15L50 24L24 15Z" fill="none" stroke="#2C4FB0" strokeWidth="0.5" />
        <circle cx="50" cy="15" r="1" fill={GOLD} />
        <path d="M50 15L68 19V27" fill="none" stroke={GOLD} strokeWidth="0.7" />
        <path d="M66.8 27L68 31.5L69.2 27Z" fill={GOLD} />
        {/* ochiq kitob */}
        <path d="M50 74C42 70 32 70 24 72V67C32 65 42 65.4 50 69Z" fill="#F3F7FD" stroke="#2C4FB0" strokeWidth="0.5" />
        <path d="M50 74C58 70 68 70 76 72V67C68 65 58 65.4 50 69Z" fill="#F3F7FD" stroke="#2C4FB0" strokeWidth="0.5" />
        <path d="M22 73.5C32 71 42 71.5 50 76C58 71.5 68 71 78 73.5" fill="none" stroke={GOLD} strokeWidth="1" />
      </svg>
    </div>
  );
}

const FLAGS = ["us", "gb", "de", "fr", "kz", "tr", "it", "cn", "jp", "kr", "in", "br"];

/** Pastdagi globus: atrofida oltin halqa va davlatlar bayroqlari. */
export function FlagGlobe() {
  // Old yarim halqa bo'ylab bayroqlar (perspektivada chetlari torroq)
  const n = 9;
  const flags = Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * (i + 0.5)) / n; // 0..π: o'ngdan chapga, oldingi yoy
    const x = 50 + 56 * Math.cos(a);
    const y = 64 + 13 * Math.sin(a);
    const k = 0.45 + 0.55 * Math.sin(a);
    const rot = (-Math.cos(a) * 14).toFixed(1);
    return { x, y, k, rot, code: FLAGS[i % FLAGS.length] };
  });
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 bottom-[6.5cqw] w-[29cqw] -translate-x-1/2">
      <div className="relative aspect-[100/86]">
        <svg viewBox="0 0 100 86" className="absolute inset-0 size-full overflow-visible">
          <ellipse cx="50" cy="64" rx="58" ry="15" fill="none" stroke="#E2C25A" strokeWidth="1.4" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/diploma/globe.png" width={600} height={600} alt="" className="absolute left-[12%] top-0 w-[76%] drop-shadow-[0_1cqw_1.4cqw_rgba(8,28,82,0.3)]" />
        <svg viewBox="0 0 100 86" className="absolute inset-0 size-full overflow-visible">
          <path d="M-8 64A58 15 0 0 0 108 64" fill="none" stroke="url(#fg-gold)" strokeWidth="2.4" />
          <defs>
            <linearGradient id="fg-gold" x1="0" x2="1">
              <stop offset="0" stopColor="#9A7714" />
              <stop offset="0.5" stopColor="#F6E19A" />
              <stop offset="1" stopColor="#9A7714" />
            </linearGradient>
          </defs>
          {flags.map((f) => (
            <g key={f.code} transform={`translate(${f.x.toFixed(2)} ${f.y.toFixed(2)}) rotate(${f.rot}) scale(${f.k.toFixed(2)} 1)`}>
              <rect x="-6.2" y="-4.9" width="12.4" height="9.8" fill="#000" opacity="0.15" transform="translate(0.5 0.6)" />
              <image href={`/diploma/flags/${f.code}.svg`} x="-6" y="-4.5" width="12" height="9" preserveAspectRatio="none" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

/** Xalqaro diplomning pastki dunyo manzarasi. */
export function IntlSkyline() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-[2%] top-[71%] opacity-50">
      <WorldSkyline />
    </div>
  );
}
