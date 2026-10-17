import { NextResponse, type NextRequest } from "next/server";
import { getClientIp } from "@/lib/request-info";
import { searchUniversities } from "@/server/university-search";

/** Bitta IP dan daqiqasiga shuncha qidiruv (Google so'rovlari pullik). */
const PER_MINUTE = 40;
const hits = new Map<string, number[]>();

function allowed(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (list.length >= PER_MINUTE) return false;
  list.push(now);
  if (hits.size > 5000) hits.clear();
  hits.set(ip, list);
  return true;
}

/** Ro'yxatdan o'tish formasi uchun universitet qidiruvi: GET /api/universities?q=... */
export async function GET(req: NextRequest) {
  if (!allowed(await getClientIp())) return NextResponse.json({ items: [] }, { status: 429 });
  const items = await searchUniversities(req.nextUrl.searchParams.get("q") ?? "");
  return NextResponse.json({ items }, { headers: { "Cache-Control": "private, max-age=300" } });
}
