import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { AdminRole } from '@prisma/client';

// Deliberately separate from NextAuth (spec §21): admin routes must never be reachable
// via a forged/escalated user session. Cookie name and secret are both admin-specific.
const ADMIN_COOKIE = 'ccai_admin_session';
const SECRET = process.env.ADMIN_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-only-secret';

export interface AdminTokenPayload {
  adminId: string;
  email: string;
  role: AdminRole;
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as AdminTokenPayload;
  } catch {
    return null;
  }
}

export function setAdminCookie(token: string) {
  cookies().set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export function clearAdminCookie() {
  cookies().delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const token = cookies().get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyAdminToken(token);
  if (!payload) return null;

  const admin = await prisma.adminUser.findUnique({ where: { id: payload.adminId } });
  if (!admin || !admin.isActive) return null;

  return payload;
}

export function requireRole(payload: AdminTokenPayload | null, roles: AdminRole[]): boolean {
  if (!payload) return false;
  return roles.includes(payload.role);
}
