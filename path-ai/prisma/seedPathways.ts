import type { Prisma, PrismaClient } from '@prisma/client';
import { PATHWAY_CONTENT } from '../src/config/pathways/digitalMarketingEntry';

/**
 * Upserts pathway content from src/config/pathways (idempotent). Content edits made there are
 * applied on the next seed; contentStatus/reviewedAt are only changed by a person, never here.
 */
export async function seedPathways(prisma: PrismaClient) {
  for (const p of PATHWAY_CONTENT) {
    const pathway = await prisma.pathway.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, title: p.title, roleLevel: p.roleLevel, description: p.description },
      update: { title: p.title, roleLevel: p.roleLevel, description: p.description },
    });
    for (const [order, s] of p.skills.entries()) {
      const data = {
        name: s.name,
        description: s.description,
        order,
        levelDescriptors: s.levelDescriptors as unknown as Prisma.InputJsonValue,
        learningSuggestions: s.learningSuggestions as unknown as Prisma.InputJsonValue,
      };
      await prisma.pathwaySkill.upsert({
        where: { pathwayId_code: { pathwayId: pathway.id, code: s.code } },
        create: { pathwayId: pathway.id, code: s.code, ...data },
        update: data,
      });
    }
    for (const [order, t] of p.tasks.entries()) {
      const data = {
        kind: t.kind,
        variantGroup: t.variantGroup,
        variant: t.variant,
        title: t.title,
        brief: t.brief,
        skillCodes: t.skillCodes,
        rubric: (t.rubric ?? []) as unknown as Prisma.InputJsonValue,
        options: t.options as unknown as Prisma.InputJsonValue | undefined,
        answerIndex: t.answerIndex ?? null,
        order,
      };
      await prisma.skillTask.upsert({
        where: { pathwayId_code: { pathwayId: pathway.id, code: t.code } },
        create: { pathwayId: pathway.id, code: t.code, ...data },
        update: data,
      });
    }
    console.log(`Seeded pathway ${p.slug}: ${p.skills.length} skills, ${p.tasks.length} tasks (content status unchanged).`);
  }
}
