import { NextResponse, type NextRequest } from "next/server";
import { gradeLabel } from "@/lib/grade";
import ExcelJS from "exceljs";
import { getT } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { studyFormLabel } from "@/lib/labels";
import { formatDateTime } from "@/lib/time";
import { finalizeExpiredAttempts } from "@/server/exam";
import { RESULT_FILTER_KEYS, resultSelect, resultsWhere, type ResultFilters } from "@/server/results";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const HEADER_KEYS = [
  "№", "F.I.Sh.", "Login", "JShShIR", "Universitet", "Fakultet", "Guruh", "Ta'lim shakli", "Test", "Fan",
  "Boshlangan", "Topshirilgan", "Avtomatik", "Ball", "Maksimal ball", "To'g'ri javoblar", "Savollar", "Foiz", "Holat", "Baho",
];
const WIDTHS = [6, 32, 12, 17, 28, 26, 10, 13, 34, 18, 20, 20, 10, 8, 10, 10, 9, 8, 10, 13];

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const { t, lang } = await getT();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: t("Ruxsat yo'q") }, { status: user ? 403 : 401 });
  }
  await finalizeExpiredAttempts();
  const HEADER = HEADER_KEYS.map((h) => t(h));
  const PASSED = t("O'tdi");
  const sp = req.nextUrl.searchParams;
  const filters: ResultFilters = {};
  for (const k of RESULT_FILTER_KEYS) filters[k] = sp.get(k) ?? undefined;
  const rows = await prisma.attempt.findMany({
    where: await resultsWhere(filters),
    orderBy: [{ test: { title: "asc" } }, { user: { fullName: "asc" } }],
    take: 50_000,
    select: resultSelect,
  });
  const data = rows.map((r, i) => {
    const passed = (r.percent ?? 0) >= r.test.passingPercent;
    return [
      i + 1,
      r.user.fullName,
      r.user.login,
      r.user.pinfl ?? "",
      r.user.university?.name ?? "",
      r.user.faculty?.name ?? "",
      r.user.group?.name ?? "",
      r.user.studyForm ? t(studyFormLabel(r.user.studyForm)) : "",
      r.test.title,
      r.test.subject ?? "",
      formatDateTime(r.startedAt, lang),
      formatDateTime(r.submittedAt, lang),
      r.autoSubmitted ? t("Ha") : t("Yo'q"),
      r.score,
      r.maxScore,
      r.correctCount,
      r.totalQuestions,
      r.percent,
      passed ? PASSED : t("O'tmadi"),
      t(gradeLabel(r.percent)),
    ] as (string | number | null)[];
  });
  const stamp = new Date().toISOString().slice(0, 10);

  if (sp.get("format") === "csv") {
    return new NextResponse("﻿" + toCsv([HEADER, ...data]), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="samu-natijalar-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "SAMU";
  const ws = wb.addWorksheet(t("Natijalar"), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = HEADER.map((h, i) => ({ header: h, width: WIDTHS[i] }));
  ws.addRows(data);
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF101D3A" } };
  head.alignment = { vertical: "middle", wrapText: true };
  head.height = 30;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: HEADER.length } };
  const statusCol = HEADER.length - 1;
  const GRADE_COLOR: Record<string, string> = {
    [t("Qoniqarsiz")]: "FFDC4545",
    [t("Qoniqarli")]: "FFD97706",
    [t("Yaxshi")]: "FF315ECA",
    [t("A'lo")]: "FF21A67A",
  };
  ws.eachRow((row, n) => {
    if (n === 1) return;
    row.eachCell((c) => {
      c.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
    });
    const st = row.getCell(statusCol);
    st.font = { bold: true, color: { argb: st.value === PASSED ? "FF21A67A" : "FFDC4545" } };
    const gr = row.getCell(HEADER.length);
    gr.font = { bold: true, color: { argb: GRADE_COLOR[String(gr.value)] ?? "FF101D3A" } };
  });
  ws.getColumn(HEADER.length - 2).numFmt = "0.0";
  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="samu-natijalar-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
