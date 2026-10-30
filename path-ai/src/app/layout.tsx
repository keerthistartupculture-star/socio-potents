import type { Metadata } from 'next';
import Link from 'next/link';
import { Fraunces, IBM_Plex_Mono, Public_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { getBranding } from '@/lib/branding';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { MentorChatWidget } from '@/components/mentor/MentorChatWidget';

// The site's type system (spec: professional yellow/black/white redesign) — a serif display
// face for headlines, a clean sans for body copy, and a mono face for data/labels (percentages,
// dimension codes). Self-hosted via next/font so there's no external request or layout shift.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});
const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

// Every page reads live, per-request data (branding, session, DB-backed content) — nothing
// here benefits from static generation, and forcing dynamic avoids requiring a reachable
// database at `next build` time (build-time prerendering would otherwise hit Postgres).
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: `${branding.productName} — Discover Your Personality. Find Your Direction.`,
    description: 'AI-powered career assessment through an interactive chat interview.',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable} ${plexMono.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <SiteHeader branding={branding} />
          <main>{children}</main>
          <footer className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
            {branding.productName} by Socio Potents ·{' '}
            <Link href="/privacy" className="underline hover:text-foreground">
              Privacy notice
            </Link>{' '}
            ·{' '}
            <a href="mailto:team@startupculture.co.in" className="underline hover:text-foreground">
              team@startupculture.co.in
            </a>
          </footer>
          <MentorChatWidget accentColor={branding.primaryColor} />
        </Providers>
      </body>
    </html>
  );
}
