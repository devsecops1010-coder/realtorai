/**
 * Bulk importer for the full IL streets dataset.
 *
 *   pnpm exec ts-node scripts/import-il-streets.ts [--limit=N]
 *
 * Pulls from data.gov.il CKAN. The "רחובות בישראל" dataset is a
 * publicly published CBS table; we walk it 32k rows at a time (CKAN's
 * datastore_search API caps at 32k per page) and upsert into
 * `IlStreet`, linking to the matching `IlSettlement` by CBS code.
 *
 * Settlements that aren't already in the DB are skipped — they need to
 * come from the curated seed or a future CBS-settlements importer. This
 * keeps the script idempotent and lets us re-run it any time without
 * fear of partial joins.
 *
 * The CKAN resource id can change when CBS publishes a new version. If
 * the hard-coded id starts returning 404, set `IL_STREETS_RESOURCE_ID`
 * in env to the new one (look up via the dataset page on data.gov.il).
 */

import { PrismaClient } from '@prisma/client';

const RESOURCE_ID =
  process.env.IL_STREETS_RESOURCE_ID ?? '9ad3862c-8391-4ba3-ae16-e664480e9001';
const BASE = 'https://data.gov.il/api/3/action/datastore_search';
const PAGE = 1000; // CKAN default page; we paginate

interface StreetRow {
  // CBS column names — Hebrew with no whitespace.
  סמל_ישוב?: number | string;
  שם_ישוב?: string;
  סמל_רחוב?: number | string;
  שם_רחוב?: string;
  שם_רחוב_לועזי?: string;
}

interface CkanResponse {
  success: boolean;
  result?: {
    total: number;
    records: StreetRow[];
  };
  error?: { message: string };
}

async function fetchPage(offset: number): Promise<CkanResponse> {
  const url = `${BASE}?resource_id=${RESOURCE_ID}&limit=${PAGE}&offset=${offset}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`CKAN ${res.status}: ${await res.text()}`);
  return (await res.json()) as CkanResponse;
}

function int(v: number | string | undefined): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function trim(v: string | undefined): string | null {
  const s = (v ?? '').toString().trim();
  return s.length === 0 ? null : s;
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
  const limit = limitArg ? Number(limitArg) : Infinity;

  const prisma = new PrismaClient();
  try {
    // Settlement code → id lookup. Built once; the CSV has ~150k rows
    // and we don't want a query per row.
    const settlements = await prisma.ilSettlement.findMany({
      select: { id: true, code: true },
    });
    const settlementByCode = new Map(settlements.map((s) => [s.code, s.id]));
    console.log(`[geo] loaded ${settlementByCode.size} settlements`);

    let offset = 0;
    let total = Infinity;
    let inserted = 0;
    let skippedNoSettlement = 0;
    let skippedBadCode = 0;

    while (offset < total && offset < limit) {
      const json = await fetchPage(offset);
      if (!json.success || !json.result) {
        throw new Error(`CKAN error: ${json.error?.message ?? 'unknown'}`);
      }
      total = json.result.total;
      const records = json.result.records;

      for (const r of records) {
        const settlementCode = int(r.סמל_ישוב);
        const streetCode = int(r.סמל_רחוב);
        const nameHe = trim(r.שם_רחוב);
        if (!settlementCode || !streetCode || !nameHe) {
          skippedBadCode++;
          continue;
        }
        const settlementId = settlementByCode.get(settlementCode);
        if (!settlementId) {
          skippedNoSettlement++;
          continue;
        }
        // Single upsert per row. ~150k of these takes ~3-5 minutes —
        // acceptable for a one-shot importer. If we re-import often we
        // can switch to chunked `createMany({ skipDuplicates: true })`.
        await prisma.ilStreet.upsert({
          where: { settlementId_code: { settlementId, code: streetCode } },
          create: {
            settlementId,
            code: streetCode,
            nameHe,
            nameEn: trim(r.שם_רחוב_לועזי),
          },
          update: {
            nameHe,
            nameEn: trim(r.שם_רחוב_לועזי),
          },
        });
        inserted++;
      }

      offset += records.length;
      console.log(
        `[geo] page offset=${offset}/${total} · inserted=${inserted} · skipped(no-settlement)=${skippedNoSettlement} · skipped(bad)=${skippedBadCode}`,
      );
      // Be a polite citizen — CKAN has no published rate limit but a
      // 100ms pause prevents accidental DoS.
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(
      `[geo] DONE · inserted=${inserted} · skipped(no-settlement)=${skippedNoSettlement} · skipped(bad)=${skippedBadCode}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
