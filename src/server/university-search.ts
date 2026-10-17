import "server-only";
import { prisma } from "@/lib/db";
import WORLD from "@/data/world-universities.json";
import { UZ_UNIVERSITIES } from "@/data/uz-universities";

/**
 * Ro'yxatdan o'tishda universitetni qidirish va tasdiqlash.
 * GOOGLE_PLACES_API_KEY berilgan bo'lsa — Google Places (haqiqiy mavjud OTMlar),
 * aks holda o'rnatilgan ro'yxat: O'zbekiston OTMlari, platformadagi universitetlar va dunyo OTMlari.
 */
export type UniversityHit = {
  /** Tanlov kaliti: "g:<placeId>" (Google) yoki "l:<nom>" (o'rnatilgan ro'yxat) */
  ref: string;
  name: string;
  /** Manzil yoki davlat — foydalanuvchiga to'g'ri OTMni tanlashga yordam beradi */
  detail: string | null;
  country: string | null;
};

const MIN_QUERY = 3;
const LIMIT = 8;

export function googleEnabled() {
  return !!process.env.GOOGLE_PLACES_API_KEY;
}

/** Apostrof va harf variantlarini bir xil ko'rinishga keltiradi (o‘, oʻ, o' …). */
export function normalizeName(v: string) {
  return v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/["«»“”]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type Entry = { name: string; country: string | null; rank: number; norm: string };
let localIndex: Entry[] | null = null;

function staticIndex(): Entry[] {
  if (!localIndex) {
    const uz = UZ_UNIVERSITIES.map((name) => ({ name, country: "UZ", rank: 0, norm: normalizeName(name) }));
    const world = (WORLD as [string, string][]).map(([name, c]) => ({ name, country: c || null, rank: c === "UZ" ? 2 : 3, norm: normalizeName(name) }));
    localIndex = [...uz, ...world];
  }
  return localIndex;
}

async function localEntries(): Promise<Entry[]> {
  const db = await prisma.university.findMany({ select: { name: true } });
  return [...db.map((u) => ({ name: u.name, country: "UZ", rank: 1, norm: normalizeName(u.name) })), ...staticIndex()];
}

const COUNTRY_NAME: Record<string, string> = { UZ: "O'zbekiston" };

async function searchLocal(q: string): Promise<UniversityHit[]> {
  const phrase = normalizeName(q);
  const tokens = phrase.split(" ").filter(Boolean);
  const seen = new Set<string>();
  // Avval so'z birikmasi to'liq mos kelganlar, keyin O'zbekiston OTMlari va qisqa nomlar
  const score = (e: Entry) => (e.norm.includes(phrase) ? 0 : 10) + e.rank;
  const hits = (await localEntries())
    .filter((e) => tokens.every((t) => e.norm.includes(t)))
    .sort((a, b) => score(a) - score(b) || a.name.length - b.name.length)
    .filter((e) => (seen.has(e.norm) ? false : (seen.add(e.norm), true)))
    .slice(0, LIMIT);
  return hits.map((e) => ({ ref: `l:${e.name}`, name: e.name, detail: e.country ? (COUNTRY_NAME[e.country] ?? e.country) : null, country: e.country }));
}

type Place = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  types?: string[];
  addressComponents?: { shortText: string; types: string[] }[];
};

const placeCountry = (p: Place) => p.addressComponents?.find((c) => c.types.includes("country"))?.shortText ?? null;

const cache = new Map<string, { at: number; hits: UniversityHit[] }>();
const CACHE_MS = 60 * 60 * 1000;

async function searchGoogle(q: string): Promise<UniversityHit[]> {
  const key = normalizeName(q);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.hits;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.addressComponents",
    },
    body: JSON.stringify({ textQuery: q, includedType: "university", languageCode: "uz", pageSize: LIMIT }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Google Places: ${res.status}`);
  const data = (await res.json()) as { places?: Place[] };
  const hits = (data.places ?? [])
    .filter((p) => p.displayName?.text)
    .map((p) => ({ ref: `g:${p.id}`, name: p.displayName!.text, detail: p.formattedAddress ?? null, country: placeCountry(p) }));
  if (cache.size > 500) cache.clear();
  cache.set(key, { at: Date.now(), hits });
  return hits;
}

export async function searchUniversities(q: string): Promise<UniversityHit[]> {
  const query = q.trim().slice(0, 100);
  if (normalizeName(query).length < MIN_QUERY) return [];
  if (googleEnabled()) {
    try {
      const g = await searchGoogle(query);
      if (g.length) return g;
    } catch (e) {
      console.error("[universities] Google qidiruvi ishlamadi", e);
    }
  }
  return searchLocal(query);
}

/**
 * Tanlangan universitetni serverda qayta tekshiradi (mijozdan kelgan nomga ishonilmaydi).
 * Topilmasa null.
 */
export async function verifyUniversity(ref: string): Promise<{ name: string; country: string | null } | null> {
  if (ref.startsWith("g:") && googleEnabled()) {
    const id = ref.slice(2);
    if (!/^[\w-]{10,300}$/.test(id)) return null;
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${id}?languageCode=uz`, {
        headers: { "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!, "X-Goog-FieldMask": "id,displayName,types,addressComponents" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) return null;
      const p = (await res.json()) as Place;
      if (!p.displayName?.text || !p.types?.includes("university")) return null;
      return { name: p.displayName.text, country: placeCountry(p) };
    } catch {
      return null;
    }
  }
  if (ref.startsWith("l:")) {
    const norm = normalizeName(ref.slice(2));
    const e = (await localEntries()).find((x) => x.norm === norm);
    return e ? { name: e.name, country: e.country } : null;
  }
  return null;
}
