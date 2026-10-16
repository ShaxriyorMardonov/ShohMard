/** SAMU muhri: logotipga o'xshash dumaloq pechat ko'rinishi. */
export function SamuSeal({ size = 132 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="SAMU" role="img" className="shrink-0">
      <defs>
        <path id="seal-top" d="M 100,100 m -74,0 a 74,74 0 1,1 148,0" />
        <path id="seal-bottom" d="M 100,100 m -74,0 a 74,74 0 1,0 148,0" />
      </defs>
      <g opacity="0.92" fill="none" stroke="#315ECA">
        <circle cx="100" cy="100" r="96" strokeWidth="4" />
        <circle cx="100" cy="100" r="88" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="58" strokeWidth="1.5" />
      </g>
      <g fill="#315ECA" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" opacity="0.92">
        <text fontSize="15" letterSpacing="3">
          <textPath href="#seal-top" startOffset="50%" textAnchor="middle">SMART ASSESSMENT</textPath>
        </text>
        <text fontSize="15" letterSpacing="3" dy="11">
          <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle">MODERN UNIVERSITY</textPath>
        </text>
        <text x="31" y="105" fontSize="14">★</text>
        <text x="157" y="105" fontSize="14">★</text>
      </g>
      {/* Markazda — SAMU belgisi */}
      <g transform="translate(76 62) scale(1.2)" opacity="0.95">
        <path d="M10 0H27.5L40 12.5V30C40 35.523 35.523 40 30 40H10C4.477 40 0 35.523 0 30V10C0 4.477 4.477 0 10 0Z" fill="#315ECA" />
        <path d="M27.5 0V8.5C27.5 10.709 29.291 12.5 31.5 12.5H40L27.5 0Z" fill="#9DB4EC" />
        <path d="M10.5 21.5L17 28L29.5 15.5" stroke="#FFFFFF" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>
      <text x="100" y="134" textAnchor="middle" fill="#315ECA" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="16" letterSpacing="4" opacity="0.95">
        SAMU
      </text>
    </svg>
  );
}
