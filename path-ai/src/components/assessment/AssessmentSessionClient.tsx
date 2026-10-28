'use client';

import { BASE_PATH } from '@/lib/basePath';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Send, LogOut, CheckCircle2, RotateCcw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';

interface Turn {
  order: number;
  question: string;
  answer: string;
}

// loading: reading the saved attempt · asking: waiting for an answer · sending: answer in flight
// review: enough answers — user checks them and presses Submit · completing: report being built
type Phase = 'loading' | 'asking' | 'sending' | 'review' | 'completing' | 'load-error';

// Every answer is saved on the server the moment it is sent. The only thing that can be lost
// is text typed but not yet sent, so that draft is mirrored to this browser's storage and put
// back if the page is refreshed, closed or the connection drops.
const draftKey = (assessmentId: string) => `pathai:draft:${assessmentId}`;

function readDraft(assessmentId: string, question: string): string {
  try {
    const raw = localStorage.getItem(draftKey(assessmentId));
    if (!raw) return '';
    const draft = JSON.parse(raw) as { question?: string; text?: string };
    return draft.question === question ? draft.text ?? '' : '';
  } catch {
    return '';
  }
}

function writeDraft(assessmentId: string, question: string, text: string) {
  try {
    if (text) localStorage.setItem(draftKey(assessmentId), JSON.stringify({ question, text }));
    else localStorage.removeItem(draftKey(assessmentId));
  } catch {
    // Storage unavailable (private mode, blocked) — drafts just aren't kept; sent answers are.
  }
}

export function AssessmentSessionClient({ assessmentId }: { assessmentId: string; framework: 'BIG_FIVE' | 'MBTI' }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [history, setHistory] = useState<Turn[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [minRequired, setMinRequired] = useState(15);
  const [textValue, setTextValue] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const answerStartRef = useRef<number>(0);
  const busyRef = useRef(false); // blocks double-send / double-submit before React re-renders
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const answeredCount = history.length;
  const questionNumber = answeredCount + 1;

  useEffect(() => {
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Keep the newest message in view by scrolling the chat panel itself — scrollIntoView would
  // also scroll the whole window and push the answer box off screen.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, question, phase]);

  const showQuestion = useCallback(
    (text: string) => {
      setQuestion(text);
      setTextValue(readDraft(assessmentId, text));
      setPhase('asking');
      answerStartRef.current = Date.now();
      setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [assessmentId]
  );

  // Rebuilds the screen from the server: every saved answer, the question currently waiting,
  // and whether the attempt is ready for review. Used on open/refresh and after any hiccup.
  const loadState = useCallback(async () => {
    setPhase('loading');
    setLoadError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/assessment/${assessmentId}/question`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.done) {
        router.push('/dashboard');
        return;
      }
      setHistory(data.history ?? []);
      setMinRequired(data.minRequired ?? 15);
      if (data.status === 'PAUSED') void fetch(`${BASE_PATH}/api/assessment/${assessmentId}/resume`, { method: 'POST' });
      if (data.readyToSubmit) {
        setQuestion(null);
        setPhase('review');
      } else {
        showQuestion(data.question.text);
      }
    } catch {
      setLoadError('We could not load your assessment. Your saved answers are safe — please check your connection and try again.');
      setPhase('load-error');
    }
  }, [assessmentId, router, showQuestion]);

  const initializedRef = useRef(false);
  useEffect(() => {
    // Guards against React StrictMode's dev-only double-invoke.
    if (initializedRef.current) return;
    initializedRef.current = true;
    void loadState();
  }, [loadState]);

  async function sendAnswer() {
    const answer = textValue.trim();
    if (busyRef.current || phase !== 'asking' || !question || !answer) return;
    busyRef.current = true;
    setPhase('sending');
    setSendError(null);

    try {
      const res = await fetch(`${BASE_PATH}/api/assessment/${assessmentId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: question,
          responseText: answer,
          inputMethod: 'TEXT',
          durationMs: Date.now() - answerStartRef.current,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The typed answer stays in the box so it can be sent again as-is.
        setSendError(data.error ?? 'This answer may not have been saved. Please send it again.');
        setPhase('asking');
        return;
      }

      writeDraft(assessmentId, question, '');
      setHistory((h) => [...h, { order: data.answeredCount || h.length + 1, question, answer }]);
      setTextValue('');

      if (data.done) {
        setQuestion(null);
        setPhase('review');
      } else if (data.followUp) {
        showQuestion(data.followUp.text);
      } else {
        await loadState();
      }
    } catch {
      setSendError(
        navigator.onLine
          ? 'The connection dropped before we could confirm this answer. Please send it again — it will not be counted twice.'
          : 'You are offline. Your typed answer is kept here — send it again once you are back online.'
      );
      setPhase('asking');
    } finally {
      busyRef.current = false;
    }
  }

  async function submitAssessment() {
    if (busyRef.current) return;
    busyRef.current = true;
    setPhase('completing');
    setSubmitError(null);
    try {
      const res = await fetch(`${BASE_PATH}/api/assessment/${assessmentId}/complete`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reportId) {
        router.push(`/report/${data.reportId}`);
        return;
      }
      setSubmitError(data.error ?? 'All your answers are saved, but the report could not be built yet. Please press Submit again.');
      setPhase('review');
    } catch {
      setSubmitError('The connection dropped. All your answers are saved — please press Submit again when you are back online.');
      setPhase('review');
    } finally {
      busyRef.current = false;
    }
  }

  async function saveAndExit() {
    if (question) writeDraft(assessmentId, question, textValue);
    await fetch(`${BASE_PATH}/api/assessment/${assessmentId}/pause`, { method: 'POST' }).catch(() => undefined);
    router.push('/dashboard');
  }

  const progressValue = Math.min(100, Math.round((answeredCount / minRequired) * 100));

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col px-4 py-6 sm:py-8">
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-medium">
            {phase === 'review' || phase === 'completing'
              ? `All ${answeredCount} answers saved`
              : `Question ${questionNumber} · at least ${minRequired} in total`}
          </p>
          <p className="text-xs text-muted-foreground">Attempt ID: {assessmentId.slice(-8)}</p>
        </div>
        <Progress value={progressValue} aria-label={`${answeredCount} of about ${minRequired} questions answered`} />
        <p className="text-xs text-muted-foreground">Each answer is saved as soon as you send it. You can leave and come back to continue.</p>
      </div>

      {!online && (
        <p role="status" className="mb-3 flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <WifiOff className="h-4 w-4" aria-hidden /> You are offline. Your saved answers are safe; keep typing and send when the connection returns.
        </p>
      )}

      {phase === 'review' || phase === 'completing' ? (
        <section aria-labelledby="review-heading" className="flex-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h1 id="review-heading" className="text-lg font-semibold">Review your answers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              That&apos;s enough to build your report. Read through what you shared, then press Submit. Your report is
              created only when you submit.
            </p>
          </div>
          <ol className="space-y-3">
            {history.map((t) => (
              <li key={t.order} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium">
                  <span className="text-muted-foreground">Q{t.order}. </span>
                  {t.question}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap">{t.answer}</p>
              </li>
            ))}
          </ol>
          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}
          <div className="sticky bottom-0 flex flex-col gap-2 border-t border-border bg-background py-3 sm:flex-row sm:justify-between">
            <Button variant="ghost" onClick={saveAndExit} disabled={phase === 'completing'}>
              <LogOut className="h-4 w-4" aria-hidden /> Save &amp; exit
            </Button>
            <Button size="lg" onClick={submitAssessment} disabled={phase === 'completing'}>
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {phase === 'completing' ? 'Building your report…' : 'Submit and see my report'}
            </Button>
          </div>
        </section>
      ) : (
        <>
          <div
            ref={chatRef}
            className="max-h-[55vh] min-h-[240px] flex-1 space-y-4 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4"
            aria-live="polite"
            aria-relevant="additions"
          >
            {history.map((t) => (
              <div key={t.order} className="space-y-4">
                <ChatBubble role="ai" text={t.question} />
                <ChatBubble role="user" text={t.answer} />
              </div>
            ))}
            {question && <ChatBubble role="ai" text={question} />}
            {phase === 'sending' && <ChatBubble role="user" text={textValue} pending />}
            {phase === 'loading' && <p className="text-sm text-muted-foreground">Loading your conversation…</p>}
          </div>

          {phase === 'load-error' ? (
            <div className="mt-4 space-y-2 text-center">
              <p role="alert" className="text-sm text-destructive">{loadError}</p>
              <Button onClick={loadState}><RotateCcw className="h-4 w-4" aria-hidden /> Try again</Button>
            </div>
          ) : (
            <form
              className="mt-4 space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                void sendAnswer();
              }}
            >
              <label htmlFor="answer" className="sr-only">Your answer to question {questionNumber}</label>
              <Textarea
                id="answer"
                ref={textareaRef}
                rows={3}
                placeholder="Type your answer…"
                value={phase === 'sending' ? '' : textValue}
                aria-invalid={sendError ? true : undefined}
                aria-describedby={sendError ? 'send-error' : undefined}
                onChange={(e) => {
                  setTextValue(e.target.value);
                  if (question) writeDraft(assessmentId, question, e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendAnswer();
                  }
                }}
                disabled={phase !== 'asking'}
              />
              {sendError && (
                <p id="send-error" role="alert" className="text-sm text-destructive">{sendError}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={saveAndExit}>
                  <LogOut className="h-4 w-4" aria-hidden /> Save &amp; exit
                </Button>
                <Button type="submit" size="sm" disabled={phase !== 'asking' || !textValue.trim()}>
                  <Send className="h-4 w-4" aria-hidden /> {phase === 'sending' ? 'Saving…' : sendError ? 'Send again' : 'Send'}
                </Button>
              </div>
            </form>
          )}
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link href="/dashboard" className="underline">Back to dashboard</Link>
          </p>
        </>
      )}
    </div>
  );
}

function ChatBubble({ role, text, pending }: { role: 'ai' | 'user'; text: string; pending?: boolean }) {
  return (
    <div className={`flex ${role === 'ai' ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${
          role === 'ai' ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground'
        } ${pending ? 'opacity-60' : ''}`}
      >
        <span className="sr-only">{role === 'ai' ? 'Question: ' : 'Your answer: '}</span>
        {text}
        {pending && <span className="sr-only"> (saving)</span>}
      </div>
    </div>
  );
}
