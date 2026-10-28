'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Sparkles, X, Send, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface MentorMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface MentorCta {
  label: string;
  href: string;
}

// Floating chat widget, mounted once in the root layout. Gated on session client-side
// (rather than only rendering it from specific pages) so it follows the user across the
// dashboard, report, and any future pages without every page needing to remember to add it.
//
// It only ever shows up once the user has a completed assessment report — offering it earlier
// would have nothing real to ground a career conversation in. Eligibility is re-checked on every
// route change (not just once on mount) because the layout that mounts this widget persists
// across client-side navigation, so finishing the assessment and landing on /report/[id] in the
// same session needs to flip it on without a full page reload.
export function MentorChatWidget({ accentColor }: { accentColor: string }) {
  const { status } = useSession();
  const pathname = usePathname();
  const [eligible, setEligible] = useState(false);
  const [cta, setCta] = useState<MentorCta[]>([]);
  const [open, setOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') {
      setEligible(false);
      setCta([]);
      return;
    }
    fetch(BASE_PATH + '/api/mentor/eligibility')
      .then((res) => (res.ok ? res.json() : { eligible: false, cta: [] }))
      .then((data) => {
        setEligible(Boolean(data.eligible));
        setCta(data.cta ?? []);
      })
      .catch(() => setEligible(false));
  }, [status, pathname]);

  useEffect(() => {
    if (!open || historyLoaded) return;
    fetch(BASE_PATH + '/api/mentor/messages')
      .then((res) => (res.ok ? res.json() : { messages: [] }))
      .then((data) => setMessages(data.messages ?? []))
      .catch(() => undefined)
      .finally(() => setHistoryLoaded(true));
  }, [open, historyLoaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  if (status !== 'authenticated' || !eligible) return null;
  // Hidden while an assessment is being answered: the floating button covered the Send button on
  // phones, and a second chat on the same screen is a distraction mid-test.
  if (pathname?.startsWith('/assessment/session')) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setError(null);
    const localId = `local-${Date.now()}`;
    setMessages((m) => [...m, { id: localId, role: 'USER', content: text }]);
    setSending(true);

    try {
      const res = await fetch(BASE_PATH + '/api/mentor/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong.');
      setMessages((m) => [...m, { id: `${localId}-reply`, role: 'ASSISTANT', content: data.reply }]);
      if (data.cta) setCta(data.cta);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[520px] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-foreground px-4 py-3 text-background">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: accentColor }} />
              <p className="text-sm font-semibold">AI Mentor</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && historyLoaded && (
              <div className="rounded-2xl bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
                Hi! I&apos;m your AI mentor. Ask me about your results, career options, or what to
                work on next.
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.role === 'ASSISTANT' ? 'justify-start' : 'justify-end')}>
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
                    m.role === 'ASSISTANT' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2.5 text-sm text-secondary-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
                </div>
              </div>
            )}
            {!sending && messages.length > 0 && cta.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {cta.map((c) => (
                  <Link
                    key={c.href}
                    href={c.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    {c.label} <ArrowRight className="h-3 w-3" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {error && <p className="px-4 pb-1 text-xs text-destructive">{error}</p>}

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your mentor anything..."
              maxLength={2000}
              className="h-10 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button type="submit" size="sm" disabled={!input.trim() || sending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close AI mentor chat' : 'Open AI mentor chat'}
        className="flex h-14 w-14 items-center justify-center rounded-full text-black shadow-lg transition-transform hover:scale-105"
        style={{ backgroundColor: accentColor }}
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </div>
  );
}
