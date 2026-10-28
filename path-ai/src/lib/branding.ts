import { prisma } from '@/lib/prisma';

export interface Branding {
  productName: string;
  primaryColor: string;
  logoUrl: string | null;
}

const DEFAULT_BRANDING: Branding = {
  productName: process.env.APP_NAME || 'PATH AI',
  primaryColor: '#F5C400',
  logoUrl: null,
};

// Product name/branding is configurable from /admin/settings (spec §1) so it can be
// rebranded later without touching code.
export async function getBranding(): Promise<Branding> {
  try {
    const row = await prisma.systemSettings.findUnique({ where: { key: 'branding' } });
    if (!row) return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...(row.value as Partial<Branding>) };
  } catch {
    return DEFAULT_BRANDING;
  }
}
