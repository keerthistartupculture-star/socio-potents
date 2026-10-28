import Link from 'next/link';
import { GraduationCap, School, Building2, Briefcase, UserRound, MessageSquare, Brain, Compass, Map } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DotGridBackground, StaircaseAccent } from '@/components/marketing/BackgroundVectors';
import { PersonalitySnapshotCard } from '@/components/marketing/PersonalitySnapshotCard';
import { TrustStrip } from '@/components/marketing/TrustStrip';
import { StepFlow } from '@/components/marketing/StepFlow';
import { FrameworkCompare } from '@/components/marketing/FrameworkCompare';
import { getBranding } from '@/lib/branding';

const steps = [
  { title: 'Tell us about yourself', desc: 'Education level and goals — this decides whether you get Big Five or MBTI.', icon: UserRound },
  { title: 'Talk to AI', desc: 'A natural chat conversation, not a boring form.', icon: MessageSquare },
  { title: 'Discover your personality', desc: 'Big Five or MBTI, scored automatically and matched to your education level.', icon: Brain },
  { title: 'Explore careers', desc: 'Matches built from personality, interests, and skills together.', icon: Compass },
  { title: 'Get your roadmap', desc: 'A personalized report with a 30/60/90-day action plan.', icon: Map },
];

const audiences = [
  { title: 'Class 10 Students', framework: 'Big Five', desc: 'Personality mapped through situational, story-based scenarios.', icon: School },
  { title: 'Class 12 Students', framework: 'MBTI', desc: 'MBTI-based exploration to guide stream and degree choices.', icon: GraduationCap },
  { title: 'College Students', framework: 'MBTI', desc: 'MBTI plus interests, skills, and career goals for your next step.', icon: Building2 },
  { title: 'Working Professionals', framework: 'MBTI', desc: 'MBTI plus role, leadership style, and long-term career direction.', icon: Briefcase },
];

export default async function LandingPage() {
  const branding = await getBranding();

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden bg-white">
        <DotGridBackground className="absolute inset-0 h-full w-full text-muted-foreground/30 [mask-image:radial-gradient(60%_55%_at_78%_20%,black,transparent_72%)]" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black"
              style={{ backgroundColor: branding.primaryColor }}
            >
              AI-Powered Career Clarity
            </span>
            <h1 className="mt-5 font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Discover your personality.
              <br />
              Find your <span className="italic text-foreground">direction.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              {branding.productName} gets to know you through a real chat conversation, scores your Big Five
              or MBTI profile, and maps it to career paths that actually fit — no forms, no guesswork.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg" className="font-semibold text-black hover:brightness-95" style={{ backgroundColor: branding.primaryColor }}>
                  Start Career Assessment
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline">
                  How It Works
                </Button>
              </Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 8.5L6 12L14 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              For career exploration and self-reflection — not a psychological diagnosis.
            </p>
          </div>
          <PersonalitySnapshotCard className="w-full" />
        </div>
      </section>

      <TrustStrip />

      {/* ---------- How it works ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <div className="mx-auto mb-12 max-w-xl text-center sm:mb-16">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            The route
          </span>
          <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">Five stops to a career roadmap</h2>
          <p className="mt-3 text-muted-foreground">Every session follows the same path — the AI adapts the questions, not the structure.</p>
        </div>
        <StepFlow steps={steps} accentColor={branding.primaryColor} />
      </section>

      {/* ---------- Audiences ---------- */}
      <section className="relative overflow-hidden border-y border-border bg-muted/40">
        <StaircaseAccent
          className="pointer-events-none absolute -right-10 bottom-0 h-[220px] w-[340px] opacity-60 sm:h-[280px] sm:w-[420px]"
          color={branding.primaryColor}
        />
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:py-20">
          <h2 className="mb-10 text-center font-serif text-2xl font-semibold sm:text-3xl">Built for every stage</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((a) => (
              <div key={a.title} className="flex flex-col gap-3 rounded-md border border-border bg-card p-5 transition-shadow hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-black"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    <a.icon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {a.framework}
                  </span>
                </div>
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Framework comparison ---------- */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:pb-20">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <span className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Which test do I take?
          </span>
          <h2 className="mt-2 font-serif text-2xl font-semibold sm:text-3xl">Two frameworks, matched to your stage</h2>
        </div>
        <FrameworkCompare accentColor={branding.primaryColor} />
      </section>

      {/* ---------- Final CTA ---------- */}
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-2 sm:pb-20 sm:pt-4">
        <div className="flex flex-col items-center gap-5 rounded-lg border border-border bg-secondary/60 px-6 py-12 text-center sm:px-12">
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">Ready to find your direction?</h2>
          <p className="text-muted-foreground">Takes about 5-7 minutes. Your progress is saved automatically.</p>
          <Link href="/register">
            <Button size="lg" className="font-semibold text-black hover:brightness-95" style={{ backgroundColor: branding.primaryColor }}>
              Start Career Assessment
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
