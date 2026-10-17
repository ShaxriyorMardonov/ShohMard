import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";
import { getClientIp, getUserAgent } from "./request-info";

export const SESSION_COOKIE = "samu_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 soat
/** Super admin 2 soat harakatsiz qolsa, sessiya tugaydi. */
const ADMIN_IDLE_MS = 2 * 60 * 60 * 1000;
/** Ikki bosqichli tasdiqni o'tish uchun vaqt. */
const MFA_PENDING_MS = 10 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string, opts: { mfaPending?: boolean } = {}) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + (opts.mfaPending ? MFA_PENDING_MS : SESSION_TTL_MS));
  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      mfaPending: !!opts.mfaPending,
      ip: await getClientIp(),
      userAgent: await getUserAgent(),
    },
  });
  // Cookie har doim to'liq muddatga qo'yiladi; tasdiqlanmagan sessiya muddatini baza belgilaydi
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    expires: new Date(Date.now() + SESSION_TTL_MS),
  });
  return session.id;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  login: string;
  fullName: string;
  /** Hozir faol rol (bir nechta rol bo'lsa, foydalanuvchi tanlagani). */
  role: Role;
  roles: Role[];
  groupName: string | null;
  /** Birinchi kirish: yangi parol qo'ymaguncha tizimdan foydalanib bo'lmaydi. */
  mustChangePassword: boolean;
  university: { id: string; name: string; shortName: string } | null;
  sessionId: string;
};

/** Joriy so'rov uchun foydalanuvchini qaytaradi (so'rov davomida keshlanadi). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          login: true,
          fullName: true,
          role: true,
          roles: true,
          isActive: true,
          mustChangePassword: true,
          group: { select: { name: true } },
          university: { select: { id: true, name: true, shortName: true, isActive: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive || session.mfaPending) return null;
  const isAdmin = session.user.roles.includes("ADMIN") || session.user.role === "ADMIN";
  const idle = Date.now() - session.lastSeenAt.getTime();
  if (isAdmin && idle > ADMIN_IDLE_MS) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  // Faollik vaqtini yangilash (har so'rovda emas, 5 daqiqada bir marta)
  if (idle > 5 * 60 * 1000) await prisma.session.updateMany({ where: { id: session.id }, data: { lastSeenAt: new Date() } });
  const { isActive: _active, group, roles: rawRoles, university: uni, ...user } = session.user;
  void _active;
  const roles = rawRoles.length ? sortRoles(rawRoles) : [user.role];
  // Universitet nofaol bo'lsa, uning talaba va menejerlari tizimdan foydalana olmaydi
  if (uni && !uni.isActive && !roles.includes("ADMIN")) return null;
  const university = uni ? { id: uni.id, name: uni.name, shortName: uni.shortName } : null;
  const role = session.activeRole && roles.includes(session.activeRole) ? session.activeRole : roles.includes(user.role) ? user.role : roles[0]!;
  return { ...user, university, role, roles, groupName: group?.name ?? null, sessionId: session.id };
});

/** Parol tekshirilgan, lekin ikki bosqichli tasdiq kutilayotgan sessiya. */
export async function getPendingMfa() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      mfaPending: true,
      user: { select: { id: true, login: true, fullName: true, role: true, roles: true, isActive: true, email: true, emailVerifiedAt: true, mustChangePassword: true } },
    },
  });
  if (!session || !session.mfaPending || session.expiresAt < new Date() || !session.user.isActive) return null;
  return session;
}

/** Ikki bosqichli tasdiq o'tildi: sessiya to'liq sessiyaga aylanadi. */
export async function completeMfa(sessionId: string) {
  // Cookie bu yerda o'zgartirilmaydi: sessiya muddatini baza belgilaydi
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.update({ where: { id: sessionId }, data: { mfaPending: false, expiresAt, lastSeenAt: new Date() } });
}

/** Foydalanuvchining joriy sessiyadan boshqa barcha sessiyalarini yopadi (parol almashganda). */
export async function revokeOtherSessions(userId: string, keepSessionId?: string) {
  await prisma.session.deleteMany({ where: { userId, ...(keepSessionId ? { NOT: { id: keepSessionId } } : {}) } });
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(homeFor(user.role));
  return user;
}

/**
 * Administrator yoki universitet menejeri.
 * `scope` — menejer uchun uning universiteti, administrator uchun null (hammasi).
 */
export type StaffUser = CurrentUser & { scope: string | null };

export async function requireStaff(): Promise<StaffUser> {
  const user = await requireUser();
  if (user.role === "ADMIN") return { ...user, scope: null };
  if (user.role === "MANAGER") {
    if (!user.university) redirect("/login?error=university");
    return { ...user, scope: user.university.id };
  }
  redirect(homeFor(user.role));
}

export async function requireStudent(): Promise<CurrentUser & { university: NonNullable<CurrentUser["university"]> }> {
  const user = await requireUser();
  if (user.role !== "STUDENT") redirect(homeFor(user.role));
  if (!user.university) redirect("/login?error=university");
  return user as CurrentUser & { university: NonNullable<CurrentUser["university"]> };
}

const ROLE_ORDER: Role[] = ["ADMIN", "MANAGER", "STUDENT"];

export function sortRoles(roles: Role[]): Role[] {
  return ROLE_ORDER.filter((r) => roles.includes(r));
}

/** Joriy sessiyada faol rolni almashtiradi. */
export async function setActiveRole(role: Role) {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  await prisma.session.updateMany({ where: { tokenHash: hashToken(token) }, data: { activeRole: role } });
}

export function homeFor(role: Role) {
  return role === "ADMIN" ? "/admin" : role === "MANAGER" ? "/admin/tests" : "/student";
}
