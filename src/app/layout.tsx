import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { HTML_LANG } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { dictFor } from "@/i18n/dict";
import { getLang } from "@/i18n/server";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SAMU — Smart Assessment & Modern University",
    template: "%s · SAMU",
  },
  description: "SAMU — bir nechta universitet talabalari uchun zamonaviy onlayn imtihon platformasi. Bilim. Natija. Kelajak.",
  applicationName: "SAMU",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#101D3A",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={HTML_LANG[lang]}>
      <body className={`${manrope.variable} font-sans`}>
        <I18nProvider lang={lang} dict={dictFor(lang)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
