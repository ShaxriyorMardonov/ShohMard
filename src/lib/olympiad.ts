import type { TestKind } from "@prisma/client";

export type OlympiadKind = Exclude<TestKind, "REGULAR">;
export type OlympiadSlug = "international" | "local";

export const OLYMPIAD_KINDS: OlympiadKind[] = ["OLYMPIAD_INTL", "OLYMPIAD_LOCAL"];

/** Olimpiadada ball har doim 100 ballik tizimda. */
export const OLYMPIAD_MAX_SCORE = 100;

export const OLYMPIAD: Record<OlympiadSlug, { kind: OlympiadKind; title: string; short: string }> = {
  international: { kind: "OLYMPIAD_INTL", title: "Xalqaro olimpiada", short: "Xalqaro" },
  local: { kind: "OLYMPIAD_LOCAL", title: "Mahalliy olimpiada", short: "Mahalliy" },
};

export function isOlympiad(kind: TestKind | null | undefined): kind is OlympiadKind {
  return kind === "OLYMPIAD_INTL" || kind === "OLYMPIAD_LOCAL";
}

export function olympiadSlug(kind: OlympiadKind): OlympiadSlug {
  return kind === "OLYMPIAD_INTL" ? "international" : "local";
}

/** Olimpiada bo'limi (oddiy test uchun undefined). */
export function slugOf(kind: TestKind): OlympiadSlug | undefined {
  return isOlympiad(kind) ? olympiadSlug(kind) : undefined;
}

export function parseOlympiadSlug(v: string | undefined | null): OlympiadSlug | null {
  return v === "international" || v === "local" ? v : null;
}

/** Testlar ro'yxati, tahrirlash va boshqalar uchun bo'lim manzili. */
export function testBasePath(kind: TestKind) {
  return isOlympiad(kind) ? `/admin/olympiads/${olympiadSlug(kind)}` : "/admin/tests";
}
