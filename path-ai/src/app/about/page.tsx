import Link from 'next/link';
import { Brain, ShieldCheck, Target, Users, School, GraduationCap, Building2, Briefcase, Sparkles, MessageCircle, Scan, Calculator } from 'lucide-react';
import { getBranding } from '@/lib/branding';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/Button';
import { HeroIllustration } from '@/components/marketing/HeroIllustration';
import { NetworkIllustration } from '@/components/marketing/NetworkIllustration';
import { ShieldIllustration } from '@/components/marketing/ShieldIllustration';
import { StepFlow } from '@/components/marketing/StepFlow';
import { DotGridBackground, BlobAccent, CompassRings } from '@/components/marketing/BackgroundVectors';

const aiProcessSteps = [
  { title: 'You respond', desc: 'A natural chat answer to a situational question.', icon: MessageCircle },
  { title: 'AI extracts a signal', desc: 'One response is read for a single trait signal — never a full profile.', icon: Scan },
  { title: 'Algorithm scores it', desc: 'The same fixed, weighted formula combines every signal into your result.', icon: Calculator },
];

const audiences = [
  { title: 'Class 10 Students', desc: 'The Big Five model, explored through situational and story-based scenarios rather than direct personality questions — built for how 14-16 year-olds actually think about themselves.', icon: School },
  { title: 'Class 12 Students', desc: 'MBTI-style exploration to help you weigh a stream, degree, or entrance-exam path with more self-awareness than a coin flip.', icon: GraduationCap },
  { title: 'College Students', desc: 'MBTI plus your actual interests, skills, learning style, and industry preferences — not personality in a vacuum.', icon: Building2 },
  { title: 'Working Professionals', desc: 'MBTI plus your role, leadership style, and long-term ambition, including honest signals on management vs. IC and entrepreneurship interest.', icon: Briefcase },
];

const principles = [
  {
    title: 'Structured scoring, not AI guesswork',
    desc: 'The AI only ever reads a single response and extracts a signal. Every final personality score and career match comes from a deterministic, weighted scoring algorithm — the AI never gets to declare a result on its own.',
    icon: Target,
  },
  {
    title: 'Confidence, not certainty',
    desc: 'Every dimension is shown with a confidence level, not presented as fact. MBTI and Big Five are frameworks for self-reflection, never a diagnosis.',
    icon: Sparkles,
  },
  {
    title: 'Built with real counselling logic',
    desc: 'Career matches combine personality with your interests, skills, academic preferences, and goals — the same inputs a human counsellor would actually ask about.',
    icon: Users,
  },
];

export default async function AboutPage() {
  const branding = await getBranding();
  const [careerCount, categoryCount, questionCount] = await Promise.all([
    prisma.career.count({ where: { isActive: true } }),
    prisma.careerCategory.count(),
    prisma.question.count({ where: { isActive: true, followUpOfId: null } }),
  ]);

  const stats = [
    { value: `${careerCount}+`, label: 'Careers in the database' },
    { value: `${categoryCount}`, label: 'Industry categories' },
    { value: `${questionCount}+`, label: 'Assessment questions' },
    { value: '2', label: 'Personality frameworks' },
  ];

  return (
    <div>
      {/* Intro */}
      <section className="relative overflow-hidden bg-white">
        <DotGridBackground className="absolute inset-0 h-full w-full text-muted-foreground/30" />
        <CompassRings className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] text-foreground/[0.05]" />
        <BlobAccent flip className="pointer-events-none absolute -bottom-28 -left-16 h-[300px] w-[300px] opacity-[0.06]" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 text-center">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black"
            style={{ backgroundColor: branding.primaryColor }}
          >
            About {branding.productName}
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Career guidance that actually listens
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            {branding.productName} exists because most career guidance is either a 20-minute quiz with
            no follow-up questions, or a one-size-fits-all lecture. We built an AI counsellor that
            has an actual conversation with you, scores it with real psychometric structure, and
            turns it into a report you can act on.
          </p>
        </div>
      </section>

      {/* Live stats strip */}
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <span className="mx-auto mt-1 block h-1 w-8 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
              <p className="mt-2 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Our mission</h2>
            <p className="mt-4 text-muted-foreground">
              Choosing a stream, a degree, or a next career move shouldn&apos;t come down to guesswork,
              peer pressure, or whichever relative has the loudest opinion. Our mission is to give
              every student and professional a structured, judgment-free way to understand how they
              think, work, and make decisions — and to connect that understanding to real career
              paths with real skills, education routes, and next steps attached.
            </p>
            <p className="mt-4 text-muted-foreground">
              We built {branding.productName} specifically to bridge Class 10 exploration all the way
              through to a working professional weighing a career pivot — because the questions
              change at every stage, but the need for honest self-insight doesn&apos;t.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <HeroIllustration className="w-full" />
          </div>
        </div>
      </section>

      {/* How the AI actually works */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div className="order-2 mx-auto w-full max-w-sm lg:order-1">
            <NetworkIllustration className="w-full" />
          </div>
          <div className="order-1 lg:order-2">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-black" style={{ backgroundColor: branding.primaryColor }}>
              <Brain className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <h2 className="text-2xl font-semibold">How the AI actually works</h2>
            <p className="mt-4 text-muted-foreground">
              A lot of &ldquo;AI personality tests&rdquo; just ask an AI model to guess your type from a
              chat transcript. We don&apos;t do that. Each response you give is analyzed individually by
              the AI to extract a single signal — for example, how strongly one answer leans toward
              Openness, or toward Introversion. Those signals are then combined by a fixed, weighted
              scoring algorithm, the same one every time, to produce your final result.
            </p>
            <p className="mt-4 text-muted-foreground">
              That&apos;s also why the AI asks intelligent follow-up questions when an answer is
              ambiguous — it&apos;s trying to get a clearer signal, not trying to write your personality
              profile for you.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-3xl px-4">
          <StepFlow steps={aiProcessSteps} accentColor={branding.primaryColor} size="sm" />
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-10 text-center text-2xl font-semibold">What we believe</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="rounded-xl border border-border p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full text-black" style={{ backgroundColor: branding.primaryColor }}>
                <p.icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <p className="font-semibold">{p.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="bg-muted/40 py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-black" style={{ backgroundColor: branding.primaryColor }}>
              <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <h2 className="text-2xl font-semibold">Your data, handled carefully</h2>
            <p className="mt-4 text-muted-foreground">
              Your answers are used only to build your assessment and report. You&apos;ll see exactly
              what&apos;s collected and why before your assessment starts, and for Class 10 students,
              a parent or guardian has to consent before anything begins.
            </p>
            <p className="mt-4 text-muted-foreground">
              Your report belongs to you: view it, download it as a PDF, or come back and retake the
              assessment later. Nothing here is a psychological diagnosis, and we say so — in the
              product and in every report we generate.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm">
            <ShieldIllustration className="w-full" />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-10 text-center text-2xl font-semibold">Built for every stage</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-xl border border-border p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full text-black" style={{ backgroundColor: branding.primaryColor }}>
                <a.icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <p className="font-semibold">{a.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-3xl overflow-hidden px-4 pb-24 text-center">
        <BlobAccent className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-[0.06]" />
        <div className="relative z-10">
          <h2 className="text-2xl font-semibold">See where your answers lead</h2>
          <p className="mt-3 text-muted-foreground">5-7 minutes, saved automatically, yours to revisit anytime.</p>
          <Link href="/register" className="mt-6 inline-block">
            <Button size="lg" className="font-semibold text-black hover:brightness-95" style={{ backgroundColor: branding.primaryColor }}>
              Start Career Assessment
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
