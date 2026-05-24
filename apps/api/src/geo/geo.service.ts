import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  IL_DISTRICTS,
  IL_SUB_DISTRICTS,
  IL_SETTLEMENTS,
  dedupSettlements,
} from './il-geo-seed-data';

/**
 * Public read-only IL geo lookup. Powers address autocomplete + city/
 * district reference lists. Backed by 4 reference tables seeded from
 * CBS data (see `il-geo-seed-data.ts` for the curated bootstrap; the
 * full ~1,260-settlement list is loaded via `seed()` and the streets
 * dataset by `scripts/import-il-streets.ts`).
 *
 * Not tenant-scoped — every tenant sees the same Israel.
 */
@Injectable()
export class GeoService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Lookups ─────────────────────────────────────────────────────

  listDistricts() {
    return this.prisma.unscoped().ilDistrict.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { settlements: true } } },
    });
  }

  listSubDistricts(districtId?: string) {
    return this.prisma.unscoped().ilSubDistrict.findMany({
      where: districtId ? { districtId } : undefined,
      orderBy: { code: 'asc' },
      include: { _count: { select: { settlements: true } } },
    });
  }

  /**
   * Autocomplete / list of settlements. Without `q` returns the top 30
   * by population — the most likely "I want to type" defaults.
   */
  async searchSettlements(opts: {
    q?: string;
    districtId?: string;
    subDistrictId?: string;
    take?: number;
  }) {
    const take = Math.min(opts.take ?? 30, 200);
    const q = opts.q?.trim() ?? '';
    return this.prisma.unscoped().ilSettlement.findMany({
      where: {
        ...(opts.districtId && { districtId: opts.districtId }),
        ...(opts.subDistrictId && { subDistrictId: opts.subDistrictId }),
        ...(q.length >= 2 && {
          OR: [
            { nameHe: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      // Sort by population desc when no search; alpha when searching so
      // the user can scan results easily.
      orderBy: q.length >= 2 ? { nameHe: 'asc' } : { population: 'desc' },
      take,
      select: {
        id: true,
        code: true,
        nameHe: true,
        nameEn: true,
        latitude: true,
        longitude: true,
        population: true,
        district: { select: { id: true, nameHe: true } },
        subDistrict: { select: { id: true, nameHe: true } },
      },
    });
  }

  async getSettlement(id: string) {
    const row = await this.prisma.unscoped().ilSettlement.findUnique({
      where: { id },
      include: {
        district: { select: { id: true, nameHe: true, nameEn: true } },
        subDistrict: { select: { id: true, nameHe: true, nameEn: true } },
        _count: { select: { streets: true } },
      },
    });
    if (!row) throw new NotFoundException('Settlement not found');
    return row;
  }

  /**
   * Autocomplete streets within a settlement. Cheap prefix search; if
   * we ever need fuzzy match we'll add `pg_trgm` and `similarity()`.
   */
  searchStreets(opts: { settlementId: string; q?: string; take?: number }) {
    const take = Math.min(opts.take ?? 30, 200);
    const q = opts.q?.trim() ?? '';
    return this.prisma.unscoped().ilStreet.findMany({
      where: {
        settlementId: opts.settlementId,
        ...(q.length >= 1 && {
          OR: [
            { nameHe: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { nameHe: 'asc' },
      take,
      select: { id: true, code: true, nameHe: true, nameEn: true },
    });
  }

  /**
   * Cross-entity address search. Tries street + settlement matches and
   * blends the result so the user can find "אבן גבירול תל אביב" by
   * typing either part. Cap small — this is autocomplete, not a full
   * text search.
   */
  async globalSearch(q: string, take = 8) {
    const trimmed = q.trim();
    if (trimmed.length < 2) return { settlements: [], streets: [] };
    const [settlements, streets] = await Promise.all([
      this.prisma.unscoped().ilSettlement.findMany({
        where: {
          OR: [
            { nameHe: { contains: trimmed, mode: 'insensitive' } },
            { nameEn: { contains: trimmed, mode: 'insensitive' } },
          ],
        },
        orderBy: { population: 'desc' },
        take,
        select: { id: true, nameHe: true, nameEn: true, population: true },
      }),
      this.prisma.unscoped().ilStreet.findMany({
        where: { nameHe: { contains: trimmed, mode: 'insensitive' } },
        take,
        orderBy: { nameHe: 'asc' },
        select: {
          id: true,
          nameHe: true,
          settlement: { select: { id: true, nameHe: true } },
        },
      }),
    ]);
    return { settlements, streets };
  }

  // ─── Seeding (idempotent) ────────────────────────────────────────

  /**
   * Insert the curated districts + sub-districts + 85 main settlements.
   * Idempotent: re-running updates names/populations + leaves existing
   * settlements alone. Safe to call on every deploy.
   */
  async seedFromCurated() {
    const tx = this.prisma.unscoped();
    let districts = 0;
    let subDistricts = 0;
    let settlements = 0;

    for (const d of IL_DISTRICTS) {
      await tx.ilDistrict.upsert({
        where: { code: d.code },
        create: { code: d.code, nameHe: d.nameHe, nameEn: d.nameEn },
        update: { nameHe: d.nameHe, nameEn: d.nameEn },
      });
      districts++;
    }

    const districtByCode = new Map(
      (await tx.ilDistrict.findMany({ select: { id: true, code: true } })).map((d) => [d.code, d.id]),
    );

    for (const s of IL_SUB_DISTRICTS) {
      const districtId = districtByCode.get(s.districtCode);
      if (!districtId) continue;
      await tx.ilSubDistrict.upsert({
        where: { code: s.code },
        create: { code: s.code, districtId, nameHe: s.nameHe, nameEn: s.nameEn },
        update: { districtId, nameHe: s.nameHe, nameEn: s.nameEn },
      });
      subDistricts++;
    }

    const subDistrictByCode = new Map(
      (await tx.ilSubDistrict.findMany({ select: { id: true, code: true } })).map((s) => [s.code, s.id]),
    );

    for (const s of dedupSettlements(IL_SETTLEMENTS)) {
      const districtId = districtByCode.get(s.districtCode);
      const subDistrictId = subDistrictByCode.get(s.subDistrictCode) ?? null;
      if (!districtId) continue;
      await tx.ilSettlement.upsert({
        where: { code: s.code },
        create: {
          code: s.code,
          nameHe: s.nameHe,
          nameEn: s.nameEn,
          districtId,
          subDistrictId,
          latitude: s.latitude,
          longitude: s.longitude,
          population: s.population ?? null,
        },
        update: {
          nameHe: s.nameHe,
          nameEn: s.nameEn,
          districtId,
          subDistrictId,
          latitude: s.latitude,
          longitude: s.longitude,
          population: s.population ?? null,
        },
      });
      settlements++;
    }

    return { districts, subDistricts, settlements };
  }
}
