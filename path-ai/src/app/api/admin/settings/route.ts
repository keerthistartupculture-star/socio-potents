import { NextResponse } from 'next/server';
import { getAdminSession, requireRole } from '@/lib/adminAuth';
import { prisma } from '@/lib/prisma';

// Configurable branding/product-name/demo-mode/retake-policy (spec §1/§13/§39/§40) — kept
// as key/value rows so new settings can be added without a migration.

export async function GET() {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['ADMIN', 'SUPER_ADMIN'])) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const settings = await prisma.systemSettings.findMany();
  return NextResponse.json({ settings: Object.fromEntries(settings.map((s) => [s.key, s.value])) });
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!requireRole(admin, ['SUPER_ADMIN'])) return NextResponse.json({ error: 'Only Super Admins can change system settings.' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.key || body.value === undefined) return NextResponse.json({ error: 'key and value are required.' }, { status: 400 });

  const setting = await prisma.systemSettings.upsert({
    where: { key: body.key },
    create: { key: body.key, value: body.value },
    update: { value: body.value },
  });

  return NextResponse.json({ setting });
}
