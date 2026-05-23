/**
 * One-shot migration: walk every Office, attempt to map each legacy
 * `areas[]` free-text entry to a row in AreaCatalog (matching on nameHe or
 * nameEn case-insensitively, then on slug). Matches become rows in
 * OfficeArea. Misses get logged for the admin to handle manually (either
 * extend the catalog or accept that the legacy text stays as-is).
 *
 * Idempotent — safe to re-run after extending the catalog. Existing matches
 * are skipped by the unique (officeId, areaId) PK.
 *
 * Usage: pnpm --filter api tsx prisma/migrate-areas-to-catalog.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/["׳״״''`]/g, '') // strip Hebrew quote chars
    .replace(/[־–—\-]/g, ' ') // any dash → space
    .replace(/\s+/g, ' ');
}

async function main() {
  const catalog = await prisma.areaCatalog.findMany({
    select: { id: true, slug: true, nameHe: true, nameEn: true },
  });

  // Build a lookup keyed on normalized he/en/slug. First-wins; in practice
  // these collide rarely (e.g. "Herzliya Bet" vs "הרצליה ב׳" both index back
  // to the same row by slug `herzliya-bet`).
  const lookup = new Map<string, string>();
  for (const row of catalog) {
    lookup.set(normalize(row.slug), row.id);
    lookup.set(normalize(row.nameHe), row.id);
    if (row.nameEn) lookup.set(normalize(row.nameEn), row.id);
  }

  const offices = await prisma.office.findMany({
    select: { id: true, name: true, areas: true },
    where: { areas: { isEmpty: false } },
  });

  let matched = 0;
  let missed = 0;
  const unmatchedSamples = new Map<string, number>();

  for (const office of offices) {
    const seen = new Set<string>();
    for (const raw of office.areas) {
      const norm = normalize(raw);
      if (!norm) continue;
      const areaId = lookup.get(norm);
      if (!areaId) {
        missed += 1;
        unmatchedSamples.set(raw, (unmatchedSamples.get(raw) ?? 0) + 1);
        continue;
      }
      if (seen.has(areaId)) continue;
      seen.add(areaId);
      await prisma.officeArea.upsert({
        where: { officeId_areaId: { officeId: office.id, areaId } },
        create: { officeId: office.id, areaId },
        update: {},
      });
      matched += 1;
    }
  }

  console.log(`Migration done: ${matched} area links created, ${missed} unmatched entries`);
  if (unmatchedSamples.size > 0) {
    console.log('Unmatched samples (top 20):');
    const sorted = Array.from(unmatchedSamples.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);
    for (const [text, count] of sorted) {
      console.log(`  - "${text}"  (×${count})`);
    }
    console.log('\nAdd these to the catalog and re-run if you want them mapped.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
