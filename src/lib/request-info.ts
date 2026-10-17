import "server-only";
import { headers } from "next/headers";

/** So'rov yuborgan mijozning IP manzili (Vercel'da x-real-ip ishonchli). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (ip || "unknown").slice(0, 64);
}

export async function getUserAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}
