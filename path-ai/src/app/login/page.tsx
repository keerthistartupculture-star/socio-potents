import { PlayCircle, Save, FileText } from 'lucide-react';
import { getBranding } from '@/lib/branding';
import { AuthSidePanel } from '@/components/auth/AuthSidePanel';
import { LoginForm } from '@/components/auth/LoginForm';

const highlights = [
  { text: 'Continue right where you left off', icon: PlayCircle },
  { text: 'Your progress is always saved automatically', icon: Save },
  { text: 'View or re-download your report anytime', icon: FileText },
];

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const branding = await getBranding();
  // Only same-app paths, so ?next= can't send someone to another site.
  const next = searchParams.next?.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : undefined;

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <AuthSidePanel
        branding={branding}
        title="Welcome back."
        subtitle="Log back in to pick up your assessment, view your report, or explore your career matches."
        highlights={highlights}
      />
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
