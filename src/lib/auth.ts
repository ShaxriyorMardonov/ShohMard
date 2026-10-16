import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "samu_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 soat

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "true",
    path: "/",
    expires: expiresAt,
  });
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
  university: { id: string; name: string; shortName: string } | null;
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
          group: { select: { name: true } },
          university: { select: { id: true, name: true, shortName: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const { isActive: _active, group, roles: rawRoles, ...user } = session.user;
  void _active;
  const roles = rawRoles.length ? sortRoles(rawRoles) : [user.role];
  const role = session.activeRole && roles.includes(session.activeRole) ? session.activeRole : roles.includes(user.role) ? user.role : roles[0]!;
  return { ...user, role, roles, groupName: group?.name ?? null };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
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
