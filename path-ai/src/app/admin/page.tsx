import { redirect } from 'next/navigation';
import { getAdminSession } from '@/lib/adminAuth';

export default async function AdminIndexPage() {
  const admin = await getAdminSession();
  redirect(admin?.role === 'TRAINER' ? '/admin/skill-checks' : '/admin/dashboard');
}
