import "server-only";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp } from "@/lib/request-info";

type Actor = { id: string | null; fullName: string; login: string | null };

/**
 * Harakatlar jurnaliga yozadi: kim, qachon, qaysi IP'dan nima qildi.
 * Jurnalga yozib bo'lmasa ham asosiy amal to'xtamaydi.
 */
export async function audit(action: string, target?: string | null, details?: unknown, actor?: Actor) {
  try {
    const me = actor ?? (await getCurrentUser().then((u) => (u ? { id: u.id, fullName: u.fullName, login: u.login } : null)));
    await prisma.auditLog.create({
      data: {
        action,
        target: target ? String(target).slice(0, 300) : null,
        details: details === undefined || details === null ? null : (typeof details === "string" ? details : JSON.stringify(details)).slice(0, 2000),
        userId: me?.id ?? null,
        userName: me?.fullName ?? "—",
        userLogin: me?.login ?? null,
        ip: await getClientIp(),
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}
