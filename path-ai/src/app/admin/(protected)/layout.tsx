import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/lib/adminAuth';
import { AdminLogoutButton } from '@/components/admin/AdminLogoutButton';

// Menu entries per role. Trainers only mark skill checks; the APIs enforce the same limits.
const STAFF = ['ADMIN', 'SUPER_ADMIN', 'COUNSELOR'];
const NAV: { href: string; label: string; roles: string[] }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', roles: STAFF },
  { href: '/admin/recovery', label: 'Recovery', roles: STAFF },
  { href: '/admin/mentor-flags', label: 'Mentor review', roles: STAFF },
  { href: '/admin/skill-checks', label: 'Skill-check marking', roles: ['ADMIN', 'SUPER_ADMIN', 'TRAINER'] },
  { href: '/admin/users', label: 'Users', roles: STAFF },
  { href: '/admin/assessments', label: 'Assessments', roles: STAFF },
  { href: '/admin/questions', label: 'Questions', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/careers', label: 'Careers', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { href: '/admin/reports', label: 'Reports', roles: STAFF },
  { href: '/admin/settings', label: 'Settings', roles: ['ADMIN', 'SUPER_ADMIN'] },
];

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession();
  if (!admin) redirect('/admin/login');

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-muted/30 p-4">
        <p className="mb-6 px-2 text-sm font-semibold">Admin Console</p>
        <nav className="space-y-1">
          {NAV.filter((item) => item.roles.includes(admin.role)).map((item) => (
            <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm hover:bg-muted">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t border-border pt-4">
          <p className="px-2 text-xs text-muted-foreground">{admin.email}</p>
          <p className="px-2 text-xs text-muted-foreground">{admin.role}</p>
          <AdminLogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
