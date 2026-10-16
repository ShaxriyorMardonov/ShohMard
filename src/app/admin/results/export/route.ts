import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";
import { resultSelect, resultsWhere } from "@/server/results";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: user ? 403 : 401 });
  }
  await finalizeExpiredAttempts();
  const sp = req.nextUrl.searchParams;
  const rows = await prisma.attempt.findMany({
    where: resultsWhere({ test: sp.get("test") ?? undefined, university: sp.get("university") ?? undefined, q: sp.get("q") ?? undefined }),
    orderBy: [{ test: { title: "asc" } }, { user: { fullName: "asc" } }],
    take: 50_000,
    select: resultSelect,
  });
  const csv = toCsv([
    ["F.I.Sh.", "Login", "Universitet", "Guruh", "Test", "Fan", "Boshlangan", "Topshirilgan", "Avtomatik", "Ball", "Maksimal ball", "To'g'ri javoblar", "Savollar", "Foiz", "Holat"],
    ...rows.map((r) => [
      r.user.fullName,
      r.user.login,
      r.user.university?.name ?? "",
      r.user.groupName ?? "",
      r.test.title,
      r.test.subject ?? "",
      formatDateTime(r.startedAt),
      formatDateTime(r.submittedAt),
      r.autoSubmitted ? "Ha" : "Yo'q",
      r.score,
      r.maxScore,
      r.correctCount,
      r.totalQuestions,
      r.percent,
      (r.percent ?? 0) >= r.test.passingPercent ? "O'tdi" : "O'tmadi",
    ]),
  ]);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="samu-natijalar-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
