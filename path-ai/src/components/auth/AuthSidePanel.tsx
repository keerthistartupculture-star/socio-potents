import { Compass, type LucideIcon } from 'lucide-react';
import { JourneyIllustration } from '@/components/marketing/JourneyIllustration';
import { DotGridBackground, PathLines, BlobAccent } from '@/components/marketing/BackgroundVectors';
import type { Branding } from '@/lib/branding';

export interface AuthHighlight {
  text: string;
  icon: LucideIcon;
}

/**
 * Shared marketing panel for the left half of auth screens (login/register). Title,
 * subtitle, and the three trust bullets are all passed in by the caller — deliberately not
 * hardcoded here — so login and register read as distinct, page-appropriate messaging
 * rather than the same generic pitch repeated on both screens.
 *
 * Sticky + viewport-locked height (`lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)]`) is
 * deliberate: the register form can grow tall (step 2 + guardian fields for Class 10) and
 * needs to scroll the page, but this panel should stay pinned in view rather than either
 * scrolling away with the form or forcing the whole page taller than the viewport itself.
 * Content sizing below (illustration, spacing) is kept compact enough to fit inside a
 * typical laptop viewport without its own internal scrolling.
 */
export function AuthSidePanel({
  branding,
  title,
  subtitle,
  highlights,
}: {
  branding: Branding;
  title: string;
  subtitle: string;
  highlights: AuthHighlight[];
}) {
  return (
    <div className="relative hidden overflow-hidden bg-black text-white lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:w-1/2 lg:flex-col lg:justify-between">
      <DotGridBackground className="absolute inset-0 h-full w-full text-white/10" />
      <PathLines className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" color="#F5C400" />
      <BlobAccent className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] opacity-[0.12]" />
      <BlobAccent flip className="pointer-events-none absolute -bottom-24 -left-24 h-[320px] w-[320px] opacity-[0.08]" />

      <div className="relative z-10 shrink-0 p-8">
        <div className="flex items-center gap-2 font-bold tracking-tight">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: branding.primaryColor }}
          >
            <Compass className="h-5 w-5 text-black" strokeWidth={2.5} />
          </span>
          <span className="text-lg">{branding.productName}</span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-8">
        <JourneyIllustration className="h-auto w-full max-w-[170px] shrink" />
        <div>
          <h2 className="text-center text-xl font-bold leading-snug">{title}</h2>
          <p className="mt-2 max-w-sm text-center text-sm text-white/70">{subtitle}</p>
        </div>
      </div>

      <div className="relative z-10 shrink-0 space-y-2.5 p-8">
        {highlights.map((h) => (
          <div key={h.text} className="flex items-center gap-3 text-sm text-white/80">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-black"
              style={{ backgroundColor: branding.primaryColor }}
            >
              <h.icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            {h.text}
          </div>
        ))}
      </div>
    </div>
  );
}
