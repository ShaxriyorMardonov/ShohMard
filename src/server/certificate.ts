import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { isResultReleased } from "@/lib/exam-rules";
import { hasCertificate } from "@/lib/grade";

/** Sertifikat raqami: urinish identifikatoridan olinadi (tekshirish sahifasi shu bo'yicha topadi). */
export function certificateNumber(attemptId: string) {
  return `SAMU-${attemptId.slice(-8).toUpperCase()}`;
}

/**
 * Sertifikat ma'lumotlari. Faqat topshirilgan, natijasi e'lon qilingan va
 * qoniqarsiz bo'lmagan (60% va undan yuqori) urinish uchun qaytadi.
 */
export async function getCertificate(attemptId: string) {
  const a = await prisma.attempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      userId: true,
      status: true,
      submittedAt: true,
      score: true,
      maxScore: true,
      percent: true,
      correctCount: true,
      totalQuestions: true,
      attemptNo: true,
      user: {
        select: {
          fullName: true,
          university: { select: { name: true } },
          faculty: { select: { name: true } },
          group: { select: { name: true } },
        },
      },
      test: { select: { title: true, subject: true, resultRelease: true, endsAt: true, resultsReleasedAt: true } },
    },
  });
  if (!a || a.status !== "SUBMITTED" || !a.submittedAt || a.percent === null) return null;
  if (!isResultReleased(a.test, new Date()) || !hasCertificate(a.percent)) return null;
  return { ...a, number: certificateNumber(a.id), percent: a.percent, submittedAt: a.submittedAt };
}

export type Certificate = NonNullable<Awaited<ReturnType<typeof getCertificate>>>;

/** Sertifikat haqiqiyligini tekshirish sahifasiga olib boruvchi QR kod (SVG). */
export async function certificateQr(attemptId: string) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/verify/${attemptId}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#101d3a", light: "#ffffff00" } });
  return { url, svg };
}
