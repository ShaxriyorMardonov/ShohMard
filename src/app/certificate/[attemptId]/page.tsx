import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CertificateView } from "@/components/certificate/certificate-view";
import { DiplomaView } from "@/components/certificate/diploma-view";
import { SupervisorForm } from "@/components/certificate/supervisor-form";
import { PrintButton } from "@/components/certificate/print-button";
import { AutoPrint } from "@/components/certificate/auto-print";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getT } from "@/i18n/server";
import { LANG_LABEL, LOCALES, isLang } from "@/i18n/config";
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
  searchParams: Promise<{ lang?: string; print?: string }>;
}) {
  const { attemptId } = await params;
  // ?lang= — sertifikat qaysi tilda chiqishi (interfeys tilidan qat'i nazar)
  const { lang: certLang, print } = await searchParams;
  const user = await requireUser();
  const c = await getCertificate(attemptId);
  if (!c) notFound();
  // Talaba faqat o'z sertifikatini, xodim esa barchasini ko'radi
  const isStaff = user.role === "ADMIN" || user.role === "MANAGER";
  const resultsBase = isOlympiad(c.test.kind) ? "/olympiad/results" : "/student/results";
  if (!isStaff && c.userId !== user.id) redirect(resultsBase);
  const { t, lang: uiLang } = await getT();
  const lang = isLang(certLang) ? certLang : uiLang;
  const qr = await certificateQr(c.id);
  // Olimpiada natijasi — kitob shaklidagi diplom, oddiy test — albom shaklidagi sertifikat
  const diploma = isOlympiad(c.test.kind);
  return (
    <main className="min-h-dvh bg-muted/60 px-4 py-6 print:bg-white print:p-0">
      <style>
        {diploma
          ? "@page { size: A4 portrait; margin: 0 } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact } .diploma { width: 210mm !important; height: 297mm !important } }"
          : "@page { size: A4 landscape; margin: 0 } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact } .certificate { width: 297mm !important; height: 210mm !important } }"}
      </style>
      <div className="mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={isStaff ? `/admin/results/${c.id}` : `${resultsBase}/${c.id}`}><ArrowLeft /> {t("Natijaga qaytish")}</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{diploma ? t("Diplom tili:") : t("Sertifikat tili:")}</span>
          <div className="flex overflow-hidden rounded-lg border border-border bg-white">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={`/certificate/${c.id}?lang=${l}`}
                replace
                aria-current={l === lang ? "true" : undefined}
                className={cn("px-3 py-1.5 text-sm font-medium", l === lang ? "bg-royal text-white" : "text-midnight hover:bg-muted")}
              >
                {LANG_LABEL[l]}
              </Link>
            ))}
          </div>
          <PrintButton />
        </div>
      </div>
      {print === "1" && <AutoPrint />}
      {diploma && c.userId === user.id && <SupervisorForm attemptId={c.id} initial={c.supervisor} />}
      {diploma ? (
        <DiplomaView c={c} qrSvg={qr.svg} t={makeT(lang, dictFor(lang))} lang={lang} />
      ) : (
        <CertificateView c={c} qrSvg={qr.svg} t={makeT(lang, dictFor(lang))} lang={lang} />
      )}
      <p className="mx-auto mt-3 max-w-[1100px] text-center text-xs text-muted-foreground print:hidden">
        {t("PDF saqlash uchun chop etish oynasida \"PDF sifatida saqlash\" ni tanlang.")}
      </p>
    </main>
  );
}
