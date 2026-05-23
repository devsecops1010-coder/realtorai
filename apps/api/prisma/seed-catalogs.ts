/**
 * Seed for global lookup tables — AreaCatalog and PlanCatalog.
 *
 * Idempotent on slug (`upsert` keyed on the unique `slug` column). Safe to run
 * repeatedly; updates name/region/order/billing-defaults to the latest values
 * in this file without touching offices/tenants that already reference these
 * rows by id.
 *
 * Run via: `pnpm --filter api prisma:seed:catalogs` (see package.json).
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Areas — Israeli geography. Mix of cities and major neighborhoods. Slug is
// kebab-case ASCII so it stays stable across Hebrew name corrections.
// Sort order groups the list by region in selects; lower = floats up.
// ---------------------------------------------------------------------------

type AreaSeed = {
  slug: string;
  nameHe: string;
  nameEn?: string;
  region: string;
  sortOrder?: number;
};

const AREAS: AreaSeed[] = [
  // --- מרכז / גוש דן ---------------------------------------------------------
  { slug: 'tel-aviv-center', nameHe: 'תל אביב — מרכז', nameEn: 'Tel Aviv — Center', region: 'מרכז', sortOrder: 10 },
  { slug: 'tel-aviv-north', nameHe: 'תל אביב — צפון', nameEn: 'Tel Aviv — North', region: 'מרכז', sortOrder: 11 },
  { slug: 'tel-aviv-south', nameHe: 'תל אביב — דרום', nameEn: 'Tel Aviv — South', region: 'מרכז', sortOrder: 12 },
  { slug: 'ramat-aviv', nameHe: 'רמת אביב', nameEn: 'Ramat Aviv', region: 'מרכז', sortOrder: 13 },
  { slug: 'florentin', nameHe: 'פלורנטין', nameEn: 'Florentin', region: 'מרכז', sortOrder: 14 },
  { slug: 'neve-tzedek', nameHe: 'נווה צדק', nameEn: 'Neve Tzedek', region: 'מרכז', sortOrder: 15 },
  { slug: 'shapira', nameHe: 'שפירא', nameEn: 'Shapira', region: 'מרכז', sortOrder: 16 },
  { slug: 'kerem-hatemanim', nameHe: 'כרם התימנים', nameEn: 'Kerem HaTeimanim', region: 'מרכז', sortOrder: 17 },
  { slug: 'ramat-gan', nameHe: 'רמת גן', nameEn: 'Ramat Gan', region: 'מרכז', sortOrder: 20 },
  { slug: 'givatayim', nameHe: 'גבעתיים', nameEn: 'Givatayim', region: 'מרכז', sortOrder: 21 },
  { slug: 'bnei-brak', nameHe: 'בני ברק', nameEn: 'Bnei Brak', region: 'מרכז', sortOrder: 22 },
  { slug: 'petah-tikva', nameHe: 'פתח תקווה', nameEn: 'Petah Tikva', region: 'מרכז', sortOrder: 23 },
  { slug: 'rishon-letzion', nameHe: 'ראשון לציון', nameEn: 'Rishon LeZion', region: 'מרכז', sortOrder: 24 },
  { slug: 'rishon-west', nameHe: 'ראשון לציון — מערב', nameEn: 'Rishon West', region: 'מרכז', sortOrder: 25 },
  { slug: 'holon', nameHe: 'חולון', nameEn: 'Holon', region: 'מרכז', sortOrder: 26 },
  { slug: 'bat-yam', nameHe: 'בת ים', nameEn: 'Bat Yam', region: 'מרכז', sortOrder: 27 },
  { slug: 'rehovot', nameHe: 'רחובות', nameEn: 'Rehovot', region: 'מרכז', sortOrder: 28 },
  { slug: 'nes-tziona', nameHe: 'נס ציונה', nameEn: 'Nes Tziona', region: 'מרכז', sortOrder: 29 },
  { slug: 'lod', nameHe: 'לוד', nameEn: 'Lod', region: 'מרכז', sortOrder: 30 },
  { slug: 'ramla', nameHe: 'רמלה', nameEn: 'Ramla', region: 'מרכז', sortOrder: 31 },
  { slug: 'modiin', nameHe: 'מודיעין', nameEn: 'Modiin', region: 'מרכז', sortOrder: 32 },
  { slug: 'yehud', nameHe: 'יהוד', nameEn: 'Yehud', region: 'מרכז', sortOrder: 33 },
  { slug: 'rosh-haayin', nameHe: 'ראש העין', nameEn: 'Rosh HaAyin', region: 'מרכז', sortOrder: 34 },
  { slug: 'beit-shemesh', nameHe: 'בית שמש', nameEn: 'Beit Shemesh', region: 'מרכז', sortOrder: 35 },

  // --- שרון ----------------------------------------------------------------
  { slug: 'herzliya', nameHe: 'הרצליה', nameEn: 'Herzliya', region: 'שרון', sortOrder: 40 },
  { slug: 'herzliya-pituach', nameHe: 'הרצליה פיתוח', nameEn: 'Herzliya Pituach', region: 'שרון', sortOrder: 41 },
  { slug: 'herzliya-bet', nameHe: 'הרצליה ב׳', nameEn: 'Herzliya Bet', region: 'שרון', sortOrder: 42 },
  { slug: 'raanana', nameHe: 'רעננה', nameEn: 'Raanana', region: 'שרון', sortOrder: 43 },
  { slug: 'kfar-saba', nameHe: 'כפר סבא', nameEn: 'Kfar Saba', region: 'שרון', sortOrder: 44 },
  { slug: 'hod-hasharon', nameHe: 'הוד השרון', nameEn: 'Hod HaSharon', region: 'שרון', sortOrder: 45 },
  { slug: 'ramat-hasharon', nameHe: 'רמת השרון', nameEn: 'Ramat HaSharon', region: 'שרון', sortOrder: 46 },
  { slug: 'netanya', nameHe: 'נתניה', nameEn: 'Netanya', region: 'שרון', sortOrder: 47 },
  { slug: 'netanya-north', nameHe: 'נתניה — צפון', nameEn: 'Netanya — North', region: 'שרון', sortOrder: 48 },
  { slug: 'netanya-south', nameHe: 'נתניה — דרום', nameEn: 'Netanya — South', region: 'שרון', sortOrder: 49 },
  { slug: 'pardes-hana', nameHe: 'פרדס חנה', nameEn: 'Pardes Hana', region: 'שרון', sortOrder: 50 },
  { slug: 'caesarea', nameHe: 'קיסריה', nameEn: 'Caesarea', region: 'שרון', sortOrder: 51 },
  { slug: 'hadera', nameHe: 'חדרה', nameEn: 'Hadera', region: 'שרון', sortOrder: 52 },
  { slug: 'even-yehuda', nameHe: 'אבן יהודה', nameEn: 'Even Yehuda', region: 'שרון', sortOrder: 53 },

  // --- ירושלים -------------------------------------------------------------
  { slug: 'jerusalem-center', nameHe: 'ירושלים — מרכז', nameEn: 'Jerusalem — Center', region: 'ירושלים', sortOrder: 60 },
  { slug: 'jerusalem-west', nameHe: 'ירושלים — מערב', nameEn: 'Jerusalem — West', region: 'ירושלים', sortOrder: 61 },
  { slug: 'jerusalem-south', nameHe: 'ירושלים — דרום', nameEn: 'Jerusalem — South', region: 'ירושלים', sortOrder: 62 },
  { slug: 'jerusalem-north', nameHe: 'ירושלים — צפון', nameEn: 'Jerusalem — North', region: 'ירושלים', sortOrder: 63 },
  { slug: 'rehavia', nameHe: 'רחביה', nameEn: 'Rehavia', region: 'ירושלים', sortOrder: 64 },
  { slug: 'baka', nameHe: 'בקעה', nameEn: 'Baka', region: 'ירושלים', sortOrder: 65 },
  { slug: 'german-colony', nameHe: 'המושבה הגרמנית', nameEn: 'German Colony', region: 'ירושלים', sortOrder: 66 },
  { slug: 'mevaseret-zion', nameHe: 'מבשרת ציון', nameEn: 'Mevaseret Zion', region: 'ירושלים', sortOrder: 67 },
  { slug: 'maale-adumim', nameHe: 'מעלה אדומים', nameEn: 'Maale Adumim', region: 'ירושלים', sortOrder: 68 },

  // --- חיפה / צפון --------------------------------------------------------
  { slug: 'haifa-carmel', nameHe: 'חיפה — כרמל', nameEn: 'Haifa — Carmel', region: 'צפון', sortOrder: 80 },
  { slug: 'haifa-hadar', nameHe: 'חיפה — הדר', nameEn: 'Haifa — Hadar', region: 'צפון', sortOrder: 81 },
  { slug: 'haifa-bay', nameHe: 'חיפה — מפרץ', nameEn: 'Haifa — Bay', region: 'צפון', sortOrder: 82 },
  { slug: 'haifa-neve-shaanan', nameHe: 'חיפה — נווה שאנן', nameEn: 'Haifa — Neve Shaanan', region: 'צפון', sortOrder: 83 },
  { slug: 'kiryat-haim', nameHe: 'קריית חיים', nameEn: 'Kiryat Haim', region: 'צפון', sortOrder: 84 },
  { slug: 'kiryat-bialik', nameHe: 'קריית ביאליק', nameEn: 'Kiryat Bialik', region: 'צפון', sortOrder: 85 },
  { slug: 'kiryat-motzkin', nameHe: 'קריית מוצקין', nameEn: 'Kiryat Motzkin', region: 'צפון', sortOrder: 86 },
  { slug: 'kiryat-yam', nameHe: 'קריית ים', nameEn: 'Kiryat Yam', region: 'צפון', sortOrder: 87 },
  { slug: 'nahariya', nameHe: 'נהריה', nameEn: 'Nahariya', region: 'צפון', sortOrder: 88 },
  { slug: 'akko', nameHe: 'עכו', nameEn: 'Akko', region: 'צפון', sortOrder: 89 },
  { slug: 'karmiel', nameHe: 'כרמיאל', nameEn: 'Karmiel', region: 'צפון', sortOrder: 90 },
  { slug: 'tiberias', nameHe: 'טבריה', nameEn: 'Tiberias', region: 'צפון', sortOrder: 91 },
  { slug: 'safed', nameHe: 'צפת', nameEn: 'Safed', region: 'צפון', sortOrder: 92 },
  { slug: 'nazareth', nameHe: 'נצרת', nameEn: 'Nazareth', region: 'צפון', sortOrder: 93 },
  { slug: 'nazareth-illit', nameHe: 'נצרת עילית', nameEn: 'Nazareth Illit', region: 'צפון', sortOrder: 94 },
  { slug: 'afula', nameHe: 'עפולה', nameEn: 'Afula', region: 'צפון', sortOrder: 95 },
  { slug: 'tivon', nameHe: 'קריית טבעון', nameEn: 'Kiryat Tivon', region: 'צפון', sortOrder: 96 },
  { slug: 'zichron-yaakov', nameHe: 'זיכרון יעקב', nameEn: 'Zichron Yaakov', region: 'צפון', sortOrder: 97 },
  { slug: 'binyamina', nameHe: 'בנימינה', nameEn: 'Binyamina', region: 'צפון', sortOrder: 98 },

  // --- שפלה ----------------------------------------------------------------
  { slug: 'ashdod', nameHe: 'אשדוד', nameEn: 'Ashdod', region: 'שפלה', sortOrder: 110 },
  { slug: 'ashkelon', nameHe: 'אשקלון', nameEn: 'Ashkelon', region: 'שפלה', sortOrder: 111 },
  { slug: 'kiryat-malachi', nameHe: 'קריית מלאכי', nameEn: 'Kiryat Malachi', region: 'שפלה', sortOrder: 112 },
  { slug: 'kiryat-gat', nameHe: 'קריית גת', nameEn: 'Kiryat Gat', region: 'שפלה', sortOrder: 113 },
  { slug: 'gan-yavne', nameHe: 'גן יבנה', nameEn: 'Gan Yavne', region: 'שפלה', sortOrder: 114 },
  { slug: 'yavne', nameHe: 'יבנה', nameEn: 'Yavne', region: 'שפלה', sortOrder: 115 },

  // --- דרום ----------------------------------------------------------------
  { slug: 'beer-sheva', nameHe: 'באר שבע', nameEn: 'Beer Sheva', region: 'דרום', sortOrder: 130 },
  { slug: 'beer-sheva-old', nameHe: 'באר שבע — עיר עתיקה', nameEn: 'Beer Sheva — Old City', region: 'דרום', sortOrder: 131 },
  { slug: 'beer-sheva-d', nameHe: 'באר שבע — דרום', nameEn: 'Beer Sheva — South', region: 'דרום', sortOrder: 132 },
  { slug: 'omer', nameHe: 'עומר', nameEn: 'Omer', region: 'דרום', sortOrder: 133 },
  { slug: 'meitar', nameHe: 'מיתר', nameEn: 'Meitar', region: 'דרום', sortOrder: 134 },
  { slug: 'lehavim', nameHe: 'להבים', nameEn: 'Lehavim', region: 'דרום', sortOrder: 135 },
  { slug: 'arad', nameHe: 'ערד', nameEn: 'Arad', region: 'דרום', sortOrder: 136 },
  { slug: 'dimona', nameHe: 'דימונה', nameEn: 'Dimona', region: 'דרום', sortOrder: 137 },
  { slug: 'sderot', nameHe: 'שדרות', nameEn: 'Sderot', region: 'דרום', sortOrder: 138 },
  { slug: 'netivot', nameHe: 'נתיבות', nameEn: 'Netivot', region: 'דרום', sortOrder: 139 },
  { slug: 'ofakim', nameHe: 'אופקים', nameEn: 'Ofakim', region: 'דרום', sortOrder: 140 },
  { slug: 'mitzpe-ramon', nameHe: 'מצפה רמון', nameEn: 'Mitzpe Ramon', region: 'דרום', sortOrder: 141 },
  { slug: 'eilat', nameHe: 'אילת', nameEn: 'Eilat', region: 'דרום', sortOrder: 142 },
];

// ---------------------------------------------------------------------------
// Plans — 4 starter tiers + flagship enterprise. Prices in ILS.
// `features` is open-schema JSON; UI knows which keys to render.
// ---------------------------------------------------------------------------

type PlanSeed = {
  slug: string;
  nameHe: string;
  nameEn: string;
  tagline: string;
  setupFeeIls: number;
  monthlyPlanIls: number;
  includedMessages: number;
  includedCallMinutes: number;
  monthlyLlmBudgetUsd: number;
  extraMessageIls: number;
  extraCallMinuteIls: number;
  successFeePct: number;
  features: Record<string, unknown>;
  publishedAt: Date | null;
  sortOrder: number;
};

const PLANS: PlanSeed[] = [
  {
    slug: 'starter',
    nameHe: 'סטארטר',
    nameEn: 'Starter',
    tagline: 'למשרד יחיד — להתחיל לאסוף לידים בלי מחויבות',
    setupFeeIls: 0,
    monthlyPlanIls: 0,
    includedMessages: 100,
    includedCallMinutes: 0,
    monthlyLlmBudgetUsd: 0,
    extraMessageIls: 0.4,
    extraCallMinuteIls: 0,
    successFeePct: 0,
    features: {
      sign: false,
      ai: 'mock',
      branding: 'realtorai',
      whatsapp: false,
      voice: false,
      teamSeats: 2,
    },
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    sortOrder: 10,
  },
  {
    slug: 'growth',
    nameHe: 'צמיחה',
    nameEn: 'Growth',
    tagline: 'למשרד שמתחיל לעבוד עם AI על הלידים',
    setupFeeIls: 1500,
    monthlyPlanIls: 990,
    includedMessages: 1000,
    includedCallMinutes: 0,
    monthlyLlmBudgetUsd: 10,
    extraMessageIls: 0.3,
    extraCallMinuteIls: 0,
    successFeePct: 0,
    features: {
      sign: true,
      ai: 'fast',
      branding: 'realtorai',
      whatsapp: true,
      voice: false,
      teamSeats: 5,
    },
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    sortOrder: 20,
  },
  {
    slug: 'pro',
    nameHe: 'מקצועי',
    nameEn: 'Pro',
    tagline: 'לרשת קטנה — AI מתקדם, ווצאפ, שיחות, חתימה',
    setupFeeIls: 3000,
    monthlyPlanIls: 2490,
    includedMessages: 5000,
    includedCallMinutes: 200,
    monthlyLlmBudgetUsd: 50,
    extraMessageIls: 0.25,
    extraCallMinuteIls: 0.8,
    successFeePct: 0,
    features: {
      sign: true,
      ai: 'pro',
      branding: 'co-branded',
      whatsapp: true,
      voice: true,
      teamSeats: 15,
      multiOffice: true,
    },
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    sortOrder: 30,
  },
  {
    slug: 'enterprise',
    nameHe: 'ארגוני',
    nameEn: 'Enterprise',
    tagline: 'לרשת גדולה — מותאם, ללא הגבלת מושבים, success fee',
    setupFeeIls: 10000,
    monthlyPlanIls: 7990,
    includedMessages: 25000,
    includedCallMinutes: 1000,
    monthlyLlmBudgetUsd: 200,
    extraMessageIls: 0.2,
    extraCallMinuteIls: 0.6,
    successFeePct: 1.0,
    features: {
      sign: true,
      ai: 'pro',
      branding: 'white-label',
      whatsapp: true,
      voice: true,
      teamSeats: 999,
      multiOffice: true,
      sso: true,
      sla: '99.9',
      onboarding: 'managed',
    },
    publishedAt: new Date('2026-01-01T00:00:00Z'),
    sortOrder: 40,
  },
];

async function seedAreas() {
  let created = 0;
  let updated = 0;
  for (const a of AREAS) {
    const result = await prisma.areaCatalog.upsert({
      where: { slug: a.slug },
      create: {
        slug: a.slug,
        nameHe: a.nameHe,
        nameEn: a.nameEn ?? null,
        region: a.region,
        sortOrder: a.sortOrder ?? 100,
        active: true,
      },
      update: {
        nameHe: a.nameHe,
        nameEn: a.nameEn ?? null,
        region: a.region,
        sortOrder: a.sortOrder ?? 100,
        // do NOT flip `active` here — admin may have manually retired a slug
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1;
    else updated += 1;
  }
  console.log(`AreaCatalog: ${created} created, ${updated} updated (total ${AREAS.length})`);
}

async function seedPlans() {
  let created = 0;
  let updated = 0;
  for (const p of PLANS) {
    const result = await prisma.planCatalog.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        nameHe: p.nameHe,
        nameEn: p.nameEn,
        tagline: p.tagline,
        setupFeeIls: p.setupFeeIls,
        monthlyPlanIls: p.monthlyPlanIls,
        includedMessages: p.includedMessages,
        includedCallMinutes: p.includedCallMinutes,
        monthlyLlmBudgetUsd: new Prisma.Decimal(p.monthlyLlmBudgetUsd),
        extraMessageIls: new Prisma.Decimal(p.extraMessageIls),
        extraCallMinuteIls: new Prisma.Decimal(p.extraCallMinuteIls),
        successFeePct: new Prisma.Decimal(p.successFeePct),
        features: p.features as Prisma.InputJsonValue,
        publishedAt: p.publishedAt,
        sortOrder: p.sortOrder,
        active: true,
      },
      update: {
        nameHe: p.nameHe,
        nameEn: p.nameEn,
        tagline: p.tagline,
        setupFeeIls: p.setupFeeIls,
        monthlyPlanIls: p.monthlyPlanIls,
        includedMessages: p.includedMessages,
        includedCallMinutes: p.includedCallMinutes,
        monthlyLlmBudgetUsd: new Prisma.Decimal(p.monthlyLlmBudgetUsd),
        extraMessageIls: new Prisma.Decimal(p.extraMessageIls),
        extraCallMinuteIls: new Prisma.Decimal(p.extraCallMinuteIls),
        successFeePct: new Prisma.Decimal(p.successFeePct),
        features: p.features as Prisma.InputJsonValue,
        sortOrder: p.sortOrder,
        // do NOT change publishedAt / active — preserve admin overrides
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1;
    else updated += 1;
  }
  console.log(`PlanCatalog: ${created} created, ${updated} updated (total ${PLANS.length})`);
}

async function main() {
  await seedAreas();
  await seedPlans();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
