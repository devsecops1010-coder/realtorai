/**
 * Seed a realistic multi-office demo network in its own tenant.
 *
 * Builds:
 *   - 1 Tenant ("נדל״ן הזוהר") with the `pro` plan applied
 *   - 1 Network
 *   - 3 Districts (מרכז, שרון, דרום)
 *   - 4 Branches (one per office in this seed)
 *   - 4 Offices, each linked to its branch + district + network
 *   - OfficeArea links pulled from the AreaCatalog by slug
 *   - 16 Users covering every role in the system (except platform_owner /
 *     platform_admin — those are intentionally outside this network)
 *   - Per-office lead_responder + property_recruiter agents
 *
 * Idempotency: keyed on the tenant name. If a tenant with the same name
 * already exists, the seed skips with a friendly message — we don't want to
 * double-create. To re-seed, delete the tenant first.
 *
 * Run via: pnpm --filter api db:seed:demo-network
 *
 * Pre-reqs: db:seed:catalogs must have run first (the script reads slugs
 * from AreaCatalog + PlanCatalog).
 */
import {
  AgentStatus,
  AgentType,
  PrismaClient,
  TenantStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TENANT_NAME = 'נדל״ן הזוהר';
const NETWORK_NAME = 'רשת הזוהר';
const EMAIL_DOMAIN = 'zohar-re.local';
const DEFAULT_PASSWORD = 'DemoPass1!';
const PLAN_SLUG = 'pro';

// Cities mapped to slugs in AreaCatalog (must exist after db:seed:catalogs).
const OFFICE_DEFS = [
  {
    key: 'ta',
    name: 'סניף ת״א מרכז',
    city: 'תל אביב',
    phone: '03-1110001',
    whatsapp: '972501110001',
    districtKey: 'merkaz',
    branchName: 'סניף תל אביב',
    areaSlugs: ['tel-aviv-center', 'florentin', 'neve-tzedek'],
  },
  {
    key: 'rg',
    name: 'סניף רמת גן',
    city: 'רמת גן',
    phone: '03-2220002',
    whatsapp: '972502220002',
    districtKey: 'merkaz',
    branchName: 'סניף רמת גן',
    areaSlugs: ['ramat-gan', 'givatayim'],
  },
  {
    key: 'hr',
    name: 'סניף הרצליה פיתוח',
    city: 'הרצליה',
    phone: '09-3330003',
    whatsapp: '972503330003',
    districtKey: 'sharon',
    branchName: 'סניף הרצליה',
    areaSlugs: ['herzliya-pituach', 'herzliya'],
  },
  {
    key: 'bs',
    name: 'סניף באר שבע',
    city: 'באר שבע',
    phone: '08-4440004',
    whatsapp: '972504440004',
    districtKey: 'darom',
    branchName: 'סניף באר שבע',
    areaSlugs: ['beer-sheva', 'beer-sheva-d'],
  },
] as const;

const DISTRICT_DEFS = [
  { key: 'merkaz', name: 'מחוז מרכז', region: 'מרכז' },
  { key: 'sharon', name: 'מחוז שרון', region: 'שרון' },
  { key: 'darom', name: 'מחוז דרום', region: 'דרום' },
] as const;

interface UserSeed {
  role: UserRole;
  name: string;
  email: string; // local-part only; domain appended at create time
  /** Office key from OFFICE_DEFS, or null for tenant-scoped roles. */
  officeKey: 'ta' | 'rg' | 'hr' | 'bs' | null;
  phone?: string;
}

const USERS: UserSeed[] = [
  // --- Network-wide (officeKey=null) ----------------------------------------
  { role: UserRole.ceo, name: 'רונן זוהר', email: 'ronen', officeKey: null, phone: '050-1234567' },
  { role: UserRole.deputy_ceo, name: 'שירה לוי', email: 'shira', officeKey: null },
  { role: UserRole.district_manager, name: 'אבי כהן (מנהל מחוז מרכז)', email: 'avi', officeKey: null },
  { role: UserRole.district_manager, name: 'מיכל פרץ (מנהלת מחוז שרון)', email: 'michal', officeKey: null },
  { role: UserRole.district_manager, name: 'יוסי גרין (מנהל מחוז דרום)', email: 'yossi', officeKey: null },
  { role: UserRole.marketing_manager, name: 'רוני לוי', email: 'roni', officeKey: null },
  { role: UserRole.mortgage_advisor, name: 'אילן יקיר', email: 'ilan', officeKey: null },
  { role: UserRole.accountant, name: 'משה רותם', email: 'moshe', officeKey: null },
  { role: UserRole.viewer, name: 'דמו צופה', email: 'viewer', officeKey: null },
  // --- Office-scoped --------------------------------------------------------
  // ת"א
  { role: UserRole.branch_manager, name: 'דנה רוזן (מנהלת סניף ת"א)', email: 'dana', officeKey: 'ta' },
  { role: UserRole.office_owner, name: 'עמית בן-דוד', email: 'amit', officeKey: 'ta' },
  { role: UserRole.team_lead, name: 'נועה ברק', email: 'noa', officeKey: 'ta' },
  { role: UserRole.realtor, name: 'תומר אזולאי', email: 'tomer', officeKey: 'ta' },
  // הרצליה
  { role: UserRole.realtor, name: 'רעות שמש', email: 'reut', officeKey: 'hr' },
  // רמת גן — secretary
  { role: UserRole.secretary, name: 'טלי מזרחי', email: 'tali', officeKey: 'rg' },
  // באר שבע — office_manager (not office_owner — to demo the distinction)
  { role: UserRole.office_manager, name: 'אופיר חיים', email: 'ofir', officeKey: 'bs' },
];

async function main() {
  // ---------- Idempotency check ---------------------------------------------
  const existing = await prisma.tenant.findFirst({ where: { name: TENANT_NAME } });
  if (existing) {
    console.log(
      `Tenant '${TENANT_NAME}' already exists (id=${existing.id}). Delete it first to re-seed.`,
    );
    return;
  }

  // ---------- Plan lookup ---------------------------------------------------
  const plan = await prisma.planCatalog.findUnique({ where: { slug: PLAN_SLUG } });
  if (!plan) {
    throw new Error(
      `PlanCatalog row '${PLAN_SLUG}' not found. Run 'pnpm db:seed:catalogs' first.`,
    );
  }

  // ---------- Area catalog lookup -------------------------------------------
  const allSlugs = [...new Set(OFFICE_DEFS.flatMap((o) => o.areaSlugs))];
  const areaRows = await prisma.areaCatalog.findMany({ where: { slug: { in: allSlugs } } });
  const missingSlugs = allSlugs.filter((s) => !areaRows.find((a) => a.slug === s));
  if (missingSlugs.length > 0) {
    throw new Error(
      `Missing AreaCatalog slugs: ${missingSlugs.join(', ')}. Run 'pnpm db:seed:catalogs' first.`,
    );
  }
  const areaIdBySlug = new Map(areaRows.map((a) => [a.slug, a.id]));

  // ---------- Password hash (shared) ----------------------------------------
  // bcrypt rounds match prod default — even seed users use prod-strength hashes.
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // ---------- Single transaction --------------------------------------------
  // Either everything lands or we leave the DB untouched.
  const result = await prisma.$transaction(async (tx) => {
    // 1. Tenant — copies plan billing defaults from the catalog
    const tenant = await tx.tenant.create({
      data: {
        name: TENANT_NAME,
        status: TenantStatus.active,
        plan: plan.slug,
        planCatalogId: plan.id,
        setupFeeIls: plan.setupFeeIls,
        monthlyPlanIls: plan.monthlyPlanIls,
        includedMessages: plan.includedMessages,
        includedCallMinutes: plan.includedCallMinutes,
        monthlyLlmBudgetUsd: plan.monthlyLlmBudgetUsd,
        billingNotes: 'Demo network seeded via seed-demo-network.ts',
      },
    });

    // 2. Network
    const network = await tx.network.create({
      data: {
        tenantId: tenant.id,
        name: NETWORK_NAME,
        notes: 'רשת דמו עם 4 סניפים. רונן זוהר (CEO).',
      },
    });

    // 3. Districts
    const districts = new Map<string, string>(); // key → id
    for (const d of DISTRICT_DEFS) {
      const row = await tx.district.create({
        data: {
          tenantId: tenant.id,
          networkId: network.id,
          name: d.name,
          region: d.region,
        },
      });
      districts.set(d.key, row.id);
    }

    // 4. Branches + 5. Offices + 6. OfficeArea links + 8. Agents
    const officeIdByKey = new Map<string, string>();
    for (const o of OFFICE_DEFS) {
      const districtId = districts.get(o.districtKey)!;
      const branch = await tx.branch.create({
        data: {
          tenantId: tenant.id,
          networkId: network.id,
          districtId,
          name: o.branchName,
          city: o.city,
        },
      });
      const office = await tx.office.create({
        data: {
          tenantId: tenant.id,
          networkId: network.id,
          districtId,
          branchId: branch.id,
          name: o.name,
          city: o.city,
          // Legacy `areas` string[] keeps WhatsApp routing + reports working
          // until the cutover. We denormalize the catalog nameHe values here.
          areas: o.areaSlugs.map((s) => {
            const row = areaRows.find((r) => r.slug === s);
            return row ? row.nameHe : s;
          }),
          phone: o.phone,
          whatsappNumber: o.whatsapp,
        },
      });
      officeIdByKey.set(o.key, office.id);

      // OfficeArea junction — catalog-backed source of truth
      await tx.officeArea.createMany({
        data: o.areaSlugs.map((slug) => ({
          officeId: office.id,
          areaId: areaIdBySlug.get(slug)!,
        })),
        skipDuplicates: true,
      });

      // Per-office agents — paused by default so they don't auto-respond on a
      // demo without explicit activation.
      const leadAgent = await tx.agent.create({
        data: {
          tenantId: tenant.id,
          officeId: office.id,
          type: AgentType.lead_responder,
          name: `Lead Responder — ${o.name}`,
          status: AgentStatus.paused,
        },
      });
      await tx.agentConfig.create({
        data: {
          tenantId: tenant.id,
          agentId: leadAgent.id,
          prompt: `מתווך AI שמקבל לידים נכנסים ל-${o.name}. דבר בעברית, קצר וענייני.`,
          version: 1,
          isActive: true,
          rules: { workingHours: '08:00-20:00' },
        },
      });
      const recAgent = await tx.agent.create({
        data: {
          tenantId: tenant.id,
          officeId: office.id,
          type: AgentType.property_recruiter,
          name: `Property Recruiter — ${o.name}`,
          status: AgentStatus.paused,
        },
      });
      await tx.agentConfig.create({
        data: {
          tenantId: tenant.id,
          agentId: recAgent.id,
          prompt: `סוכן גיוס נכסים עבור ${o.name}. שואל בעלי דירות אם הם מוכרים. תמיד מנומס.`,
          version: 1,
          isActive: true,
          rules: { workingHours: '09:00-19:00' },
        },
      });
    }

    // 7. Users — single createMany would be faster but we want stable per-user
    // logging for the report at the end. ~16 inserts is fine inline.
    const createdUsers: { name: string; email: string; role: UserRole }[] = [];
    for (const u of USERS) {
      const fullEmail = `${u.email}@${EMAIL_DOMAIN}`;
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          officeId: u.officeKey ? officeIdByKey.get(u.officeKey) : null,
          name: u.name,
          email: fullEmail,
          phone: u.phone ?? null,
          role: u.role,
          status: UserStatus.active,
          passwordHash,
        },
      });
      createdUsers.push({ name: u.name, email: fullEmail, role: u.role });
    }

    // Audit
    await tx.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorType: 'system',
        action: 'tenant.demo_seeded',
        targetType: 'tenant',
        targetId: tenant.id,
        metadata: {
          script: 'seed-demo-network.ts',
          users: createdUsers.length,
          offices: OFFICE_DEFS.length,
          districts: DISTRICT_DEFS.length,
        },
      },
    });

    return {
      tenantId: tenant.id,
      networkId: network.id,
      offices: officeIdByKey.size,
      users: createdUsers.length,
      userList: createdUsers,
    };
  });

  // ---------- Report ---------------------------------------------------------
  console.log('');
  console.log('✓ Demo network seeded');
  console.log(`  tenantId: ${result.tenantId}`);
  console.log(`  network : ${NETWORK_NAME}`);
  console.log(`  offices : ${result.offices}`);
  console.log(`  districts: ${DISTRICT_DEFS.length}`);
  console.log(`  users   : ${result.users}`);
  console.log('');
  console.log('Login credentials (all users share the same password):');
  console.log(`  password: ${DEFAULT_PASSWORD}`);
  console.log('');
  for (const u of result.userList) {
    console.log(`  ${u.role.padEnd(20)} ${u.email}`.padEnd(60) + `  ${u.name}`);
  }
  console.log('');
  console.log(`Recommended first login: ronen@${EMAIL_DOMAIN} (CEO of the network)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
