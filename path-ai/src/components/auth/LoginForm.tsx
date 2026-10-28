'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn('credentials', { redirect: false, email, password }).catch(() => null);
    setLoading(false);
    if (result?.ok) {
      router.push(next ?? '/dashboard');
    } else if (!result) {
      setError('Network error. Please check your connection and try again.');
    } else {
      setError('That email and password do not match an account. Check them and try again.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-bold">Log in</h1>
      <p className="mt-1 text-sm text-muted-foreground">Welcome back — pick up where you left off.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" required aria-describedby={error ? 'login-error' : undefined} value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required aria-describedby={error ? 'login-error' : undefined} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p id="login-error" role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Log in'}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account? <Link href="/register" className="font-medium text-foreground hover:underline">Register</Link>
      </p>
    </div>
  );
}
