import { redirect } from "next/navigation";
import { BarChart3, ClipboardCheck, ShieldCheck } from "lucide-react";
import { BRAND, SamuLogo } from "@/components/brand/samu-logo";
import { LangSwitcher } from "@/components/layout/lang-switcher";
import { getT } from "@/i18n/server";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Tizimga kirish") };
}

const FEATURES = [
  { icon: ClipboardCheck, text: "Testlarni qulay va xavfsiz muhitda ishlang" },
  { icon: ShieldCheck, text: "Javoblaringiz avtomatik saqlanadi" },
  { icon: BarChart3, text: "Natijalaringizni kuzatib boring" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  // Universitetsiz qolgan talaba/menejer qayta yo'naltirish halqasiga tushmasligi uchun
  if (user && (user.role === "ADMIN" || user.university)) redirect(homeFor(user.role));
  const { t } = await getT();
  const { error } = await searchParams;
  const notice = error === "university" ? t("Hisobingiz universitetga biriktirilmagan. Administrator bilan bog'laning.") : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-midnight p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border-[48px] border-white/[0.04]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-royal/20 blur-3xl" />
        <SamuLogo tone="dark" size="md" withFullName />
        <div className="relative mt-auto max-w-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#9DB4EC]">{t(BRAND.slogan)}</p>
          <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">{t("Bilim sari yangi imkoniyatlar")}</h1>
          <p className="mt-5 text-base leading-relaxed text-white/75">
            {t("SAMU platformasi orqali testlaringizni ishlang, bilimlaringizni baholang va natijalaringizni kuzatib boring.")}
          </p>
          <ul className="mt-10 grid gap-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex size-9 items-center justify-center rounded-lg bg-white/8 ring-1 ring-white/10">
                  <Icon className="size-4 text-[#9DB4EC]" />
                </span>
                {t(text)}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-white/45">© {new Date().getFullYear()} SAMU · {BRAND.fullName}</p>
      </section>

      <section className="flex flex-col items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-4 flex justify-end">
            <LangSwitcher compact className="w-full max-w-[220px]" />
          </div>
          <div className="mb-8 lg:hidden">
            <SamuLogo size="md" withFullName />
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-royal">{t(BRAND.slogan)}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
            <h2 className="text-2xl font-extrabold text-midnight">{t("Xush kelibsiz!")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              <span className="lg:hidden">{t("Bilim sari yangi imkoniyatlar.")} </span>
              {t("Davom etish uchun hisobingizga kiring.")}
            </p>
            <div className="mt-7">
              <LoginForm notice={notice} />
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("Login va parolni universitetingiz yoki platforma administratoridan oling.")}
          </p>
        </div>
      </section>
    </main>
  );
}
