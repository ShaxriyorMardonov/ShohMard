import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CertificateView } from "@/components/certificate/certificate-view";
import { AutoPrint, PrintAllLangsButton, PrintButton } from "@/components/certificate/print-button";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { LOCALES } from "@/i18n/config";
import { dictFor } from "@/i18n/dict";
import { makeT } from "@/i18n/translate";
import { requireUser } from "@/lib/auth";
import { certificateQr, getCertificate } from "@/server/certificate";
import { isOlympiad } from "@/lib/olympiad";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Sertifikat") };
}

export default async function CertificatePage({
  params,
  searchParams,
}: {
  params: Promise<{ attemptId: string }>;
  searchParams: Promise<{ langs?: string }>;
}) {
  const { attemptId } = await params;
  // ?langs=all — barcha 4 tildagi versiya, har biri alohida varaqda (bitta PDF)
  const allLangs = (await searchParams).langs === "all";
  const user = await requireUser();
  const c = await getCertificate(attemptId);
  if (!c) notFound();
  // Talaba faqat o'z sertifikatini, xodim esa barchasini ko'radi
  const isStaff = user.role === "ADMIN" || user.role === "MANAGER";
  const resultsBase = isOlympiad(c.test.kind) ? "/olympiad/results" : "/student/results";
  if (!isStaff && c.userId !== user.id) redirect(resultsBase);
  const { t, lang } = await getT();
  const qr = await certificateQr(c.id);
  return (
    <main className="min-h-dvh bg-muted/60 px-4 py-6 print:bg-white print:p-0">
      <style>
        {"@page { size: A4 landscape; margin: 0 } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact } .certificate { width: 297mm !important; height: 210mm !important } .cert-page { break-after: page } .cert-page:last-child { break-after: auto } }"}
      </style>
      <div className="mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={isStaff ? `/admin/results/${c.id}` : `${resultsBase}/${c.id}`}><ArrowLeft /> {t("Natijaga qaytish")}</Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          {!allLangs && <PrintAllLangsButton href={`/certificate/${c.id}?langs=all`} />}
          <PrintButton />
        </div>
      </div>
      {allLangs ? (
        <div>
          <AutoPrint />
          {LOCALES.map((l) => (
            <div key={l} className="cert-page mb-6 print:mb-0">
              <CertificateView c={c} qrSvg={qr.svg} t={makeT(l, dictFor(l))} lang={l} />
            </div>
          ))}
        </div>
      ) : (
        <CertificateView c={c} qrSvg={qr.svg} t={t} lang={lang} />
      )}
      <p className="mx-auto mt-3 max-w-[1100px] text-center text-xs text-muted-foreground print:hidden">
        {t("PDF saqlash uchun chop etish oynasida \"PDF sifatida saqlash\" ni tanlang.")}
      </p>
    </main>
  );
}
