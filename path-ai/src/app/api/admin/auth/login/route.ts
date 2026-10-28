import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { adminLoginSchema } from '@/lib/validation';
import { signAdminToken, setAdminCookie } from '@/lib/adminAuth';
import { rateLimit, clientKeyFromRequest } from '@/lib/rateLimit';
import { trackEvent } from '@/services/analyticsService';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  const { allowed } = rateLimit(clientKeyFromRequest(req, 'admin-login'));
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 });

  const body = await req.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });

  const admin = await prisma.adminUser.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!admin || !admin.isActive) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const valid = await bcrypt.compare(parsed.data.password, admin.passwordHash);
  if (!valid) {
    logger.warn('Failed admin login attempt', { adminId: admin.id });
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const token = signAdminToken({ adminId: admin.id, email: admin.email, role: admin.role });
  setAdminCookie(token);
  await prisma.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await trackEvent(null, 'admin_login', { admin_role: admin.role });

  return NextResponse.json({ ok: true, role: admin.role });
}
