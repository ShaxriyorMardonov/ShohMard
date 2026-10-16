import { cn } from "@/lib/utils";

export const BRAND = {
  name: "SAMU",
  fullName: "Smart Assessment & Modern University",
  slogan: "Bilim. Natija. Kelajak.",
} as const;

type Tone = "light" | "dark";

/**
 * SAMU belgisi: buklangan burchakli imtihon varag'i va belgilangan javob (✓).
 * Kichik o'lchamlarda ham aniq ko'rinadi.
 */
export function SamuMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        d="M10 0H27.5L40 12.5V30C40 35.523 35.523 40 30 40H10C4.477 40 0 35.523 0 30V10C0 4.477 4.477 0 10 0Z"
        fill="#315ECA"
      />
      <path d="M27.5 0V8.5C27.5 10.709 29.291 12.5 31.5 12.5H40L27.5 0Z" fill="#9DB4EC" />
      <path
        d="M10.5 21.5L17 28L29.5 15.5"
        stroke="#FFFFFF"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  /** To'liq nomni so'z belgisi ostida ko'rsatish */
  withFullName?: boolean;
  className?: string;
};

const SIZES = {
  sm: { mark: 28, text: "text-lg", sub: "text-[10px]" },
  md: { mark: 36, text: "text-2xl", sub: "text-[11px]" },
  lg: { mark: 52, text: "text-4xl", sub: "text-sm" },
} as const;

export function SamuLogo({ tone = "light", size = "md", withFullName = false, className }: LogoProps) {
  const s = SIZES[size];
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label={`${BRAND.name} — ${BRAND.fullName}`}>
      <SamuMark size={s.mark} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-extrabold tracking-[0.14em]",
            s.text,
            tone === "dark" ? "text-white" : "text-midnight",
          )}
        >
          SAMU
        </span>
        {withFullName && (
          <span
            className={cn(
              "mt-1 font-medium tracking-wide",
              s.sub,
              tone === "dark" ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {BRAND.fullName}
          </span>
        )}
      </span>
    </span>
  );
}
