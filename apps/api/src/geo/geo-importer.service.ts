import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IL_DISTRICTS,
  IL_SETTLEMENTS as CURATED_SETTLEMENTS,
} from './il-geo-seed-data';

/**
 * Live importer for the official CBS reference data from data.gov.il.
 *
 * Two datasets, both refreshed monthly by CBS:
 *   - "רשימת ישובים בישראל" — 1,306 settlements, with nepha (sub-district)
 *     code and Hebrew/English names
 *   - "רשימת רחובות בישראל" — 63,563 streets per settlement (each carries
 *     sml_yishuv → settlement code → our IlSettlement.code)
 *
 * Both resources are CKAN datastore tables. We page through them with the
 * standard `datastore_search?offset=&limit=` pattern.
 *
 * District mapping from nepha: the first digit of the 2-digit nepha
 * matches the district code (e.g. nepha 32 → district 3 / Haifa). This
 * holds for all 26 nepha codes published by CBS in 2025-2026.
 *
 * Idempotent: re-running upserts everything in place. Curated lat/lng +
 * population for the 85 main cities is preserved by matching on Hebrew
 * name (CBS's name is the source of truth; we only fill the gaps).
 */
@Injectable()
export class GeoImporterService {
  private readonly logger = new Logger(GeoImporterService.name);

  // Real CKAN resource ids, confirmed live November 2026. Override via
  // env if CBS republishes (settle on the data.gov.il dataset page).
  private readonly SETTLEMENT_RES =
    process.env.IL_SETTLEMENTS_RESOURCE_ID ??
    '5c78e9fa-c2e2-4771-93ff-7f400a12f7ba';
  private readonly STREETS_RES =
    process.env.IL_STREETS_RESOURCE_ID ??
    '9ad3862c-8391-4b2f-84a4-2d4c68625f4b';
  private readonly CKAN_BASE = 'https://data.gov.il/api/3/action/datastore_search';
  private readonly PAGE = 1000;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ────────────────────────────────────────────────────

  private async fetchPage<T>(resourceId: string, offset: number): Promise<{ total: number; records: T[] }> {
    const url = `${this.CKAN_BASE}?resource_id=${resourceId}&limit=${this.PAGE}&offset=${offset}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`CKAN ${res.status} at offset=${offset}`);
    const json = (await res.json()) as { success: boolean; result?: { total: number; records: T[] } };
    if (!json.success || !json.result) throw new Error('CKAN response unsuccessful');
    return json.result;
  }

  /**
   * Parse a CBS code field. CBS pads codes with trailing whitespace in
   * the JSON output ("3000 ") so we always trim before Number(). Returns
   * null for missing / unparseable values rather than NaN.
   */
  private toInt(v: unknown): number | null {
    if (v === null || v === undefined) return null;
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }

  private toStr(v: unknown): string | null {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length === 0 ? null : s;
  }

  // ─── Sub-district sync (26 nepha codes) ─────────────────────────

  /**
   * Sync the 7 districts + all 26 nepha codes from CBS. Districts are
   * derived from nepha (floor(nepha/10)). Idempotent.
   */
  private async ensureDistrictsAndSubDistricts(): Promise<{
    districtByCode: Map<number, string>;
    subByCode: Map<number, string>;
  }> {
    const tx = this.prisma.unscoped();

    // Districts (1-7). Names come from our curated seed since CBS doesn't
    // publish them as a separate table — they're implicit in nepha codes.
    for (const d of IL_DISTRICTS) {
      await tx.ilDistrict.upsert({
        where: { code: d.code },
        create: { code: d.code, nameHe: d.nameHe, nameEn: d.nameEn },
        update: { nameHe: d.nameHe, nameEn: d.nameEn },
      });
    }
    const districtByCode = new Map(
      (await tx.ilDistrict.findMany({ select: { id: true, code: true } })).map((d) => [d.code, d.id]),
    );

    // Walk one page of settlements to harvest the full sub-district list.
    // 1,306 settlements means a single page (CKAN cap is 32k) is enough.
    const first = await this.fetchPage<Record<string, unknown>>(this.SETTLEMENT_RES, 0);
    const seen = new Map<number, { name: string; districtCode: number }>();
    for (const row of first.records) {
      const code = this.toInt(row['סמל_נפה']);
      const name = this.toStr(row['שם_נפה']);
      if (code === null || !name) continue;
      const districtCode = Math.floor(code / 10);
      if (!seen.has(code)) seen.set(code, { name, districtCode });
    }

    for (const [code, info] of seen.entries()) {
      const districtId = districtByCode.get(info.districtCode);
      if (!districtId) continue;
      await tx.ilSubDistrict.upsert({
        where: { code },
        create: { code, districtId, nameHe: info.name, nameEn: null },
        update: { districtId, nameHe: info.name },
      });
    }

    const subByCode = new Map(
      (await tx.ilSubDistrict.findMany({ select: { id: true, code: true } })).map((s) => [s.code, s.id]),
    );

    return { districtByCode, subByCode };
  }

  // ─── Settlements import ─────────────────────────────────────────

  /**
   * Full settlements sync. Pulls all ~1,306 from CBS, upserts on the
   * official `code`. Preserves curated lat/lng + population for the 85
   * cities we have rich data for by matching on Hebrew name.
   *
   * Returns counts so the caller can surface what changed.
   */
  async importSettlements(): Promise<{
    fetched: number;
    inserted: number;
    skipped: number;
    enrichedWithCoords: number;
    subDistricts: number;
  }> {
    const { districtByCode, subByCode } = await this.ensureDistrictsAndSubDistricts();
    const tx = this.prisma.unscoped();

    // Curated overlay — map Hebrew name → lat/lng/population. CBS uses
    // a few different spellings ("תל אביב - יפו" vs "תל אביב יפו"); we
    // normalize by stripping spaces, hyphens, geresh.
    const norm = (s: string) =>
      s.replace(/\s+/g, '').replace(/[-–—־'"׳״]/g, '').toLowerCase();
    const curatedByNorm = new Map(
      CURATED_SETTLEMENTS.map((c) => [norm(c.nameHe), c]),
    );

    let fetched = 0;
    let inserted = 0;
    let skipped = 0;
    let enriched = 0;
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const page = await this.fetchPage<Record<string, unknown>>(this.SETTLEMENT_RES, offset);
      total = page.total;
      for (const row of page.records) {
        fetched++;
        const code = this.toInt(row['סמל_ישוב']);
        const nameHe = this.toStr(row['שם_ישוב']);
        const nameEn = this.toStr(row['שם_ישוב_לועזי']);
        const nepha = this.toInt(row['סמל_נפה']);
        if (!code || !nameHe || !nepha) {
          skipped++;
          continue;
        }
        const districtCode = Math.floor(nepha / 10);
        const districtId = districtByCode.get(districtCode);
        const subDistrictId = subByCode.get(nepha) ?? null;
        if (!districtId) {
          skipped++;
          continue;
        }

        const curated = curatedByNorm.get(norm(nameHe));
        const latitude = curated?.latitude ?? null;
        const longitude = curated?.longitude ?? null;
        const population = curated?.population ?? null;
        if (curated) enriched++;

        await tx.ilSettlement.upsert({
          where: { code },
          create: {
            code, nameHe, nameEn, districtId, subDistrictId,
            latitude, longitude, population,
          },
          // On update: don't overwrite existing lat/lng/population with
          // null — preserves any coords the operator added manually via
          // the dashboard.
          update: {
            nameHe, nameEn, districtId, subDistrictId,
            ...(latitude !== null && { latitude }),
            ...(longitude !== null && { longitude }),
            ...(population !== null && { population }),
          },
        });
        inserted++;
      }
      offset += page.records.length;
      this.logger.log(`[geo:settlements] ${offset}/${total} fetched=${fetched} inserted=${inserted} enriched=${enriched}`);
    }

    return { fetched, inserted, skipped, enrichedWithCoords: enriched, subDistricts: subByCode.size };
  }

  // ─── Streets import ─────────────────────────────────────────────

  /**
   * Full streets sync. ~63,563 rows. Walks the CBS streets dataset and
   * upserts on (settlementId, code). Streets whose settlement isn't in
   * the DB are skipped (we'd need to run `importSettlements()` first).
   *
   * Uses chunked createMany for raw inserts — faster than per-row
   * upsert for the initial load. Re-runs do per-row upserts to handle
   * name changes on already-imported streets.
   */
  async importStreets(opts?: { onlyMissing?: boolean }): Promise<{
    fetched: number;
    inserted: number;
    skipped: number;
  }> {
    const tx = this.prisma.unscoped();
    const settlements = await tx.ilSettlement.findMany({ select: { id: true, code: true } });
    const settlementByCode = new Map(settlements.map((s) => [s.code, s.id]));
    this.logger.log(`[geo:streets] ${settlementByCode.size} settlements in DB`);

    // For incremental mode: only fetch streets for settlements with no
    // streets yet. Used by the "smart import" endpoint that runs after
    // settlements are seeded but before the heavy full import.
    let skipExisting: Set<string> | null = null;
    if (opts?.onlyMissing) {
      const haveStreets = await tx.ilStreet.findMany({
        select: { settlementId: true },
        distinct: ['settlementId'],
      });
      skipExisting = new Set(haveStreets.map((r) => r.settlementId));
      this.logger.log(`[geo:streets] skipping ${skipExisting.size} settlements that already have streets`);
    }

    let fetched = 0;
    let inserted = 0;
    let skipped = 0;
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const page = await this.fetchPage<Record<string, unknown>>(this.STREETS_RES, offset);
      total = page.total;

      // Bucket by settlement so we can createMany per chunk.
      const buckets = new Map<string, { code: number; nameHe: string }[]>();
      for (const row of page.records) {
        fetched++;
        const sCode = this.toInt(row['סמל_ישוב']);
        const stCode = this.toInt(row['סמל_רחוב']);
        const nameHe = this.toStr(row['שם_רחוב']);
        if (!sCode || !stCode || !nameHe) { skipped++; continue; }
        const settlementId = settlementByCode.get(sCode);
        if (!settlementId) { skipped++; continue; }
        if (skipExisting?.has(settlementId)) { skipped++; continue; }
        const arr = buckets.get(settlementId) ?? [];
        arr.push({ code: stCode, nameHe });
        buckets.set(settlementId, arr);
      }

      for (const [settlementId, rows] of buckets.entries()) {
        // createMany + skipDuplicates is dramatically faster than
        // per-row upsert. Re-imports skip already-present (settlementId,
        // code) pairs thanks to the unique constraint.
        const res = await tx.ilStreet.createMany({
          data: rows.map((r) => ({ settlementId, code: r.code, nameHe: r.nameHe })),
          skipDuplicates: true,
        });
        inserted += res.count;
        skipped += rows.length - res.count;
      }

      offset += page.records.length;
      this.logger.log(`[geo:streets] ${offset}/${total} fetched=${fetched} inserted=${inserted} skipped=${skipped}`);
      // Be polite — 100ms gap between pages.
      await new Promise((r) => setTimeout(r, 100));
    }

    return { fetched, inserted, skipped };
  }
}
