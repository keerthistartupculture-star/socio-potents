'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch(BASE_PATH + '/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Invalid credentials.');
      return;
    }
    // Trainers only mark skill checks, so they start on the marking queue.
    router.push(data.role === 'TRAINER' ? '/admin/skill-checks' : '/admin/dashboard');
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader><CardTitle className="text-2xl">Admin Login</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
