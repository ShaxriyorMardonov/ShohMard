import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { CertificateView } from "@/components/certificate/certificate-view";
import { PrintButton } from "@/components/certificate/print-button";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { certificateQr, getCertificate } from "@/server/certificate";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Sertifikat") };
}

export default async function CertificatePage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const user = await requireUser();
  const c = await getCertificate(attemptId);
  if (!c) notFound();
  // Talaba faqat o'z sertifikatini, xodim esa barchasini ko'radi
  const isStaff = user.role === "ADMIN" || user.role === "MANAGER";
  if (!isStaff && c.userId !== user.id) redirect("/student/results");
  const { t, lang } = await getT();
  const qr = await certificateQr(c.id);
  return (
    <main className="min-h-dvh bg-muted/60 px-4 py-6 print:bg-white print:p-0">
      <style>{"@page { size: A4 landscape; margin: 0 } @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact } .certificate { width: 297mm !important; height: 210mm !important } }"}</style>
      <div className="mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href={isStaff ? `/admin/results/${c.id}` : `/student/results/${c.id}`}><ArrowLeft /> {t("Natijaga qaytish")}</Link>
        </Button>
        <PrintButton />
      </div>
      <CertificateView c={c} qrSvg={qr.svg} t={t} lang={lang} />
      <p className="mx-auto mt-3 max-w-[1100px] text-center text-xs text-muted-foreground print:hidden">
        {t("PDF saqlash uchun chop etish oynasida \"PDF sifatida saqlash\" ni tanlang.")}
      </p>
    </main>
  );
}
