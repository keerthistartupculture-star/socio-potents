'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { Compass, Menu, X } from 'lucide-react';
import { Button, buttonClasses } from '@/components/ui/Button';
import type { Branding } from '@/lib/branding';
import { BASE_PATH } from '@/lib/basePath';

const NAV_LINKS = [
  { href: '/pathways', label: 'Skill Pathways' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/careers', label: 'Careers' },
  { href: '/about', label: 'About' },
];

export function SiteHeader({ branding }: { branding: Branding }) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-foreground">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: branding.primaryColor }}
          >
            <Compass className="h-5 w-5 text-black" strokeWidth={2.5} />
          </span>
          <span>{branding.productName}</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="transition-colors hover:text-foreground">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {session ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">Dashboard</Link>
              <Button
                size="sm"
                variant="outline"
                onClick={() => signOut({ callbackUrl: `${BASE_PATH}/` })}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">Log in</Link>
              <Link
                href="/register"
                className={buttonClasses({ size: 'sm', className: 'font-semibold text-black hover:brightness-95' })}
                style={{ backgroundColor: branding.primaryColor }}
              >
                Start Assessment
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-input md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
      {/* The desktop links are hidden below md, so phones get them here instead of losing them. */}
      {menuOpen && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-border px-4 py-2 md:hidden">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm font-medium">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
