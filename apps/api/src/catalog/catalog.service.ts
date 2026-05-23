import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Read service for the global catalogs (AreaCatalog, PlanCatalog). Anything
 * mutating lives on the AdminCatalogController behind platform_admin role.
 *
 * Tenancy: catalogs are platform-wide, NOT per-tenant — we deliberately use
 * `prisma.unscoped()` everywhere here to bypass the tenant extension.
 */
@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Areas ---------------------------------------------------------

  listAreas(opts: { includeInactive?: boolean } = {}) {
    return this.prisma.unscoped().areaCatalog.findMany({
      where: opts.includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { nameHe: 'asc' }],
    });
  }

  async createArea(data: {
    slug: string;
    nameHe: string;
    nameEn?: string | null;
    region?: string | null;
    sortOrder?: number;
  }) {
    const slug = normalizeSlug(data.slug);
    return this.prisma.unscoped().areaCatalog.create({
      data: {
        slug,
        nameHe: data.nameHe.trim(),
        nameEn: data.nameEn?.trim() || null,
        region: data.region?.trim() || null,
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 100,
        active: true,
      },
    });
  }

  async updateArea(
    id: string,
    data: {
      nameHe?: string;
      nameEn?: string | null;
      region?: string | null;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    await this.ensureAreaExists(id);
    const patch: Prisma.AreaCatalogUpdateInput = {};
    if (data.nameHe !== undefined) patch.nameHe = data.nameHe.trim();
    if (data.nameEn !== undefined) patch.nameEn = data.nameEn?.trim() || null;
    if (data.region !== undefined) patch.region = data.region?.trim() || null;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.active !== undefined) patch.active = data.active;
    return this.prisma.unscoped().areaCatalog.update({ where: { id }, data: patch });
  }

  private async ensureAreaExists(id: string) {
    const exists = await this.prisma.unscoped().areaCatalog.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Area not found');
  }

  // ---------- Plans ---------------------------------------------------------

  listPlans(opts: { includeInactive?: boolean } = {}) {
    return this.prisma.unscoped().planCatalog.findMany({
      where: opts.includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { monthlyPlanIls: 'asc' }],
    });
  }

  async createPlan(data: {
    slug: string;
    nameHe: string;
    nameEn?: string | null;
    tagline?: string | null;
    setupFeeIls?: number;
    monthlyPlanIls?: number;
    includedMessages?: number;
    includedCallMinutes?: number;
    monthlyLlmBudgetUsd?: number | string;
    extraMessageIls?: number | string;
    extraCallMinuteIls?: number | string;
    successFeePct?: number | string;
    features?: Prisma.InputJsonValue;
    sortOrder?: number;
    publishedAt?: Date | null;
  }) {
    return this.prisma.unscoped().planCatalog.create({
      data: {
        slug: normalizeSlug(data.slug),
        nameHe: data.nameHe.trim(),
        nameEn: data.nameEn?.trim() || null,
        tagline: data.tagline?.trim() || null,
        setupFeeIls: data.setupFeeIls ?? 0,
        monthlyPlanIls: data.monthlyPlanIls ?? 0,
        includedMessages: data.includedMessages ?? 0,
        includedCallMinutes: data.includedCallMinutes ?? 0,
        monthlyLlmBudgetUsd: toDecimal(data.monthlyLlmBudgetUsd ?? 0),
        extraMessageIls: toDecimal(data.extraMessageIls ?? 0),
        extraCallMinuteIls: toDecimal(data.extraCallMinuteIls ?? 0),
        successFeePct: toDecimal(data.successFeePct ?? 0),
        features: (data.features ?? {}) as Prisma.InputJsonValue,
        sortOrder: data.sortOrder ?? 100,
        publishedAt: data.publishedAt ?? null,
        active: true,
      },
    });
  }

  async updatePlan(
    id: string,
    data: {
      nameHe?: string;
      nameEn?: string | null;
      tagline?: string | null;
      setupFeeIls?: number;
      monthlyPlanIls?: number;
      includedMessages?: number;
      includedCallMinutes?: number;
      monthlyLlmBudgetUsd?: number | string;
      extraMessageIls?: number | string;
      extraCallMinuteIls?: number | string;
      successFeePct?: number | string;
      features?: Prisma.InputJsonValue;
      sortOrder?: number;
      active?: boolean;
      publishedAt?: Date | null;
    },
  ) {
    await this.ensurePlanExists(id);
    const patch: Prisma.PlanCatalogUpdateInput = {};
    if (data.nameHe !== undefined) patch.nameHe = data.nameHe.trim();
    if (data.nameEn !== undefined) patch.nameEn = data.nameEn?.trim() || null;
    if (data.tagline !== undefined) patch.tagline = data.tagline?.trim() || null;
    if (data.setupFeeIls !== undefined) patch.setupFeeIls = data.setupFeeIls;
    if (data.monthlyPlanIls !== undefined) patch.monthlyPlanIls = data.monthlyPlanIls;
    if (data.includedMessages !== undefined) patch.includedMessages = data.includedMessages;
    if (data.includedCallMinutes !== undefined) patch.includedCallMinutes = data.includedCallMinutes;
    if (data.monthlyLlmBudgetUsd !== undefined)
      patch.monthlyLlmBudgetUsd = toDecimal(data.monthlyLlmBudgetUsd);
    if (data.extraMessageIls !== undefined) patch.extraMessageIls = toDecimal(data.extraMessageIls);
    if (data.extraCallMinuteIls !== undefined)
      patch.extraCallMinuteIls = toDecimal(data.extraCallMinuteIls);
    if (data.successFeePct !== undefined) patch.successFeePct = toDecimal(data.successFeePct);
    if (data.features !== undefined) patch.features = data.features as Prisma.InputJsonValue;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.active !== undefined) patch.active = data.active;
    if (data.publishedAt !== undefined) patch.publishedAt = data.publishedAt;
    return this.prisma.unscoped().planCatalog.update({ where: { id }, data: patch });
  }

  async getPlanBySlug(slug: string) {
    const p = await this.prisma.unscoped().planCatalog.findUnique({ where: { slug } });
    if (!p) throw new NotFoundException(`Plan slug '${slug}' not in catalog`);
    return p;
  }

  async getPlanById(id: string) {
    const p = await this.prisma.unscoped().planCatalog.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Plan not found');
    return p;
  }

  private async ensurePlanExists(id: string) {
    const exists = await this.prisma.unscoped().planCatalog.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Plan not found');
  }
}

// Stable, ascii-only slug. We allow letters, digits, `-`, `_` and lowercase
// everything. Spaces collapse to a single dash.
function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 60);
}

function toDecimal(v: number | string): string {
  // Prisma accepts Decimal as string — keep arithmetic precision client-side.
  if (typeof v === 'string') return v;
  return v.toString();
}
