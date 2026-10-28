'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function AdminLogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="mt-2 w-full justify-start"
      onClick={async () => {
        await fetch(BASE_PATH + '/api/admin/auth/logout', { method: 'POST' });
        router.push('/admin/login');
      }}
    >
      Sign out
    </Button>
  );
}
