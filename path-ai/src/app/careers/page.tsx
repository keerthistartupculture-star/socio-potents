import { Cpu, Briefcase, Palette, FlaskConical, Stethoscope, Scale, GraduationCap, Landmark, Compass } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DotGridBackground, BlobAccent } from '@/components/marketing/BackgroundVectors';
import { CategoryDistributionChart } from '@/components/marketing/CategoryDistributionChart';
import { getBranding } from '@/lib/branding';

const CATEGORY_ICONS: Record<string, typeof Compass> = {
  cpu: Cpu,
  briefcase: Briefcase,
  palette: Palette,
  flask: FlaskConical,
  stethoscope: Stethoscope,
  scale: Scale,
  'graduation-cap': GraduationCap,
  landmark: Landmark,
};

export default async function CareersPage() {
  const [branding, categories] = await Promise.all([
    getBranding(),
    prisma.careerCategory.findMany({
      include: { careers: { where: { isActive: true }, orderBy: { title: 'asc' } } },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden bg-white">
        <DotGridBackground className="absolute inset-0 h-full w-full text-muted-foreground/30" />
        <BlobAccent flip className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] opacity-[0.07]" />
        <div className="relative z-10 mx-auto max-w-5xl px-4 py-14">
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide text-black"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Career Database
          </span>
          <h1 className="mt-4 text-3xl font-bold">Explore Careers</h1>
          <p className="mt-2 text-muted-foreground">Browse the career database used to generate your personalized matches.</p>
        </div>
      </section>

      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Database at a glance</p>
          <h2 className="mb-6 text-xl font-semibold">Careers by category</h2>
          <CategoryDistributionChart
            data={categories.map((cat) => ({ name: cat.name, count: cat.careers.length })).sort((a, b) => b.count - a.count)}
            accentColor={branding.primaryColor}
          />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="space-y-10">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon ?? ''] ?? Compass;
            return (
              <div key={cat.id}>
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-black"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <h2 className="text-xl font-semibold">{cat.name}</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.careers.map((career) => (
                    <Card key={career.id}>
                      <CardHeader><CardTitle className="text-base">{career.title}</CardTitle></CardHeader>
                      <CardContent>
                        <p className="line-clamp-3 text-sm text-muted-foreground">{career.description}</p>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {career.skillsRequired.slice(0, 3).map((s) => (
                            <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
