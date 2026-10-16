import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body className={`${manrope.variable} font-sans`}>{children}</body>
    </html>
  );
}
