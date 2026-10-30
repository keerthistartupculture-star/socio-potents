import Link from 'next/link';
import { UserRound, ShieldCheck, MessageSquare, Target, Compass, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DotGridBackground, BlobAccent, PathLines } from '@/components/marketing/BackgroundVectors';
import { StepFlow } from '@/components/marketing/StepFlow';
import { getBranding } from '@/lib/branding';

const items = [
  { title: 'Tell us about yourself', desc: 'Name, education level, and career goal — this determines whether you get the Big Five or MBTI assessment.', icon: UserRound },
  { title: 'Consent', desc: 'We explain exactly what data is collected and how AI is used before anything starts. Minors need guardian consent.', icon: ShieldCheck },
  { title: 'Talk to AI', desc: 'Answer situational questions in a natural chat. The AI asks natural follow-ups when your answer is interesting or ambiguous — no repeated questions.', icon: MessageSquare },
  { title: 'Personality scoring', desc: 'Your responses are scored using a structured, weighted algorithm — not just a single AI guess — with confidence levels shown, not absolute claims.', icon: Target },
  { title: 'Career matching', desc: 'Careers are shortlisted and ranked by how well your personality preferences fit them; your career goal, if you share one, is used in the explanations. Skills and knowledge are not tested.', icon: Compass },
  { title: 'Your report', desc: 'A detailed report with strengths, development areas, a career roadmap, and a 30/60/90-day action plan — downloadable as PDF.', icon: FileText },
];

export default async function HowItWorksPage() {
  const branding = await getBranding();

  return (
    <div>
      <section className="relative overflow-hidden bg-white">
        <DotGridBackground className="absolute inset-0 h-full w-full text-muted-foreground/30" />
        <BlobAccent className="pointer-events-none absolute -right-28 -top-28 h-[380px] w-[380px] opacity-[0.07]" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16 text-center">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black"
            style={{ backgroundColor: branding.primaryColor }}
          >
            The Process
          </span>
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">How it works</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Six steps from onboarding to a personalized career report — no dead ends, no repeated
            questions.
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            The process, at a glance
          </p>
          <StepFlow steps={items.map(({ title, icon }) => ({ title, icon }))} accentColor={branding.primaryColor} />
        </div>
      </section>

      <section className="relative overflow-hidden">
        <PathLines className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-16">
          <div className="space-y-6">
            {items.map((item, i) => (
              <div key={item.title} className="flex gap-4 rounded-xl border border-border bg-card p-5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  <item.icon className="h-5 w-5" strokeWidth={2.25} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {i + 1}</p>
                  <h2 className="font-semibold">{item.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href="/register">
              <Button size="lg" className="font-semibold text-black hover:brightness-95" style={{ backgroundColor: branding.primaryColor }}>
                Start Career Assessment
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
