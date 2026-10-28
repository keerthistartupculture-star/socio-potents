import { Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';
import { getBranding } from '@/lib/branding';
import { AuthSidePanel } from '@/components/auth/AuthSidePanel';
import { RegisterForm } from '@/components/auth/RegisterForm';

const highlights = [
  { text: 'Big Five & MBTI, matched to your education level', icon: Sparkles },
  { text: 'A natural chat conversation, not a boring form', icon: MessageSquare },
  { text: 'Your data stays private and is never sold', icon: ShieldCheck },
];

export default async function RegisterPage() {
  const branding = await getBranding();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AuthSidePanel
        branding={branding}
        title="Your career direction, mapped in one conversation."
        subtitle="Class 10 through working professional — the right personality framework is picked automatically, and every career match comes with a real roadmap."
        highlights={highlights}
      />
      {/* No vertical centering here on purpose: register step 2 (esp. with guardian fields
          for Class 10) can be taller than the viewport, and centering a too-tall flex item
          clips its top above the fold. Top-aligned with generous py instead. */}
      <div className="flex-1 px-4 py-12 lg:py-16">
        <RegisterForm />
      </div>
    </div>
  );
}
