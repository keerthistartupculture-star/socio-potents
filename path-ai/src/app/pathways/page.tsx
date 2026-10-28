import Link from 'next/link';
import { sessionUserId } from '@/lib/sessionUser';
import { listPathways } from '@/services/pathwayService';
import { ChoosePathwayButton } from '@/components/pathways/ChoosePathwayButton';

export default async function PathwaysPage() {
  const userId = await sessionUserId();
  const pathways = await listPathways(userId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Skill pathways</h1>
      <p className="mt-2 text-muted-foreground">
        Try short practical tasks from real entry-level work, get marked feedback from a trainer, and see which skills to build
        next. You choose the pathway — your report&apos;s career suggestions are ideas to explore, not a decision made for you.
      </p>

      <div className="mt-8 space-y-4">
        {pathways.map((p) => (
          <div key={p.slug} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{p.title}</h2>
                <p className="text-sm text-muted-foreground">{p.roleLevel}</p>
              </div>
              {p.contentStatus !== 'TRAINER_REVIEWED' && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Pilot · draft content</span>
              )}
            </div>
            <p className="mt-3 text-sm">{p.description}</p>
            <p className="mt-3 text-xs text-muted-foreground">Skills checked: {p.skills.join(' · ')}</p>
            <div className="mt-4">
              {!userId ? (
                <Link href="/login" className="text-sm font-medium underline">Log in to choose this pathway</Link>
              ) : p.enrolled ? (
                <Link href={`/pathways/${p.slug}`} className="text-sm font-medium underline">Continue this pathway</Link>
              ) : (
                <ChoosePathwayButton slug={p.slug} />
              )}
            </div>
          </div>
        ))}
        {pathways.length === 0 && <p className="text-sm text-muted-foreground">No pathways are open yet.</p>}
      </div>
    </div>
  );
}
