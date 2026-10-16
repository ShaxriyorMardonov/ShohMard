import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const XLSX: Record<string, { file: string; header: string[]; rows: string[][]; widths: number[] }> = {
  "universitetlar.xlsx": {
    file: "universitetlar.xlsx",
    header: ["Nomi", "Qisqa nomi", "Shahar"],
    rows: [
      ["Toshkent davlat texnika universiteti", "TDTU", "Toshkent"],
      ["Samarqand davlat universiteti", "SamDU", "Samarqand"],
    ],
    widths: [45, 15, 18],
  },
  "talabalar.xlsx": {
    file: "talabalar.xlsx",
    header: ["F.I.Sh.", "Login", "Parol", "Universitet (qisqa nomi)", "Guruh"],
    rows: [
      ["Aliyev Vali Karimovich", "vali.aliyev", "Parol2026", "TDTU", "KI-21"],
      ["Karimova Nodira Akramovna", "nodira.karimova", "Parol2026", "SamDU", "MT-11"],
    ],
    widths: [32, 20, 14, 26, 10],
  },
  "savollar.xlsx": {
    file: "savollar.xlsx",
    header: ["Savol", "Turi (bitta / ko'p / to'g'ri-noto'g'ri)", "Fan", "A", "B", "C", "D", "E", "F", "To'g'ri javob", "Izoh"],
    rows: [
      ["2 + 2 nechaga teng?", "bitta", "Matematika", "3", "4", "5", "6", "", "", "B", ""],
      ["Qaysilari tub son?", "ko'p", "Matematika", "2", "4", "13", "21", "", "", "A, C", "Tub son faqat 1 va o'ziga bo'linadi"],
      ["Yer Quyosh atrofida aylanadi.", "to'g'ri-noto'g'ri", "Tabiiy fanlar", "", "", "", "", "", "", "To'g'ri", ""],
    ],
    widths: [40, 22, 14, 12, 12, 12, 12, 8, 8, 14, 30],
  },
};

const WORD_LINES = [
  "SAMU — savollar namunasi",
  "Har bir savol raqam bilan boshlanadi. To'g'ri javob oldiga * belgisini qo'ying.",
  "Bir nechta to'g'ri javob bo'lsa, har biriga * qo'ying. \"Fan:\" qatori keyingi savollarga qo'llanadi.",
  "",
  "Fan: Matematika",
  "1. 2 + 2 nechaga teng?",
  "A) 3",
  "*B) 4",
  "C) 5",
  "D) 6",
  "",
  "2. Qaysilari tub son?",
  "*A) 2",
  "B) 4",
  "*C) 13",
  "D) 21",
  "Izoh: Tub son faqat 1 va o'ziga bo'linadi.",
  "",
  "Fan: Tabiiy fanlar",
  "3. Yer Quyosh atrofida aylanadi.",
  "*A) To'g'ri",
  "B) Noto'g'ri",
  "",
  "4. Suvning qaynash harorati (normal bosimda) necha gradus?",
  "A) 90",
  "B) 100",
  "C) 120",
  "Javob: B",
];

export async function GET(_req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  const { kind } = await params;

  let body: Buffer;
  let type: string;
  if (kind === "savollar.docx") {
    const doc = new Document({
      sections: [
        {
          children: WORD_LINES.map(
            (t, i) => new Paragraph({ children: [new TextRun({ text: t, bold: i === 0, size: i === 0 ? 28 : 24 })] }),
          ),
        },
      ],
    });
    body = await Packer.toBuffer(doc);
    type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  } else if (XLSX[kind]) {
    const t = XLSX[kind]!;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Ma'lumotlar");
    ws.addRow(t.header).font = { bold: true };
    t.rows.forEach((r) => ws.addRow(r));
    t.widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
    body = Buffer.from(await wb.xlsx.writeBuffer());
    type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  } else {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="samu-${kind}"`,
      "Cache-Control": "no-store",
    },
  });
}
