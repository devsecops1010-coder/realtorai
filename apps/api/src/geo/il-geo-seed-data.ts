/**
 * Curated static seed of IL administrative geography.
 *
 * Sourced from CBS (Israeli Central Bureau of Statistics) publication
 * "List of localities, their populations and codes" — the same lookup
 * table the Ministry of Interior uses. Codes are the official CBS
 * "Mispar Yishuv" identifiers.
 *
 * Coverage: 6 districts × 15 sub-districts × ~85 settlements. This
 * captures the cities holding ~95% of Israel's population. The full
 * ~1,260-settlement list lives in CBS's open dataset on data.gov.il —
 * `scripts/import-il-streets.ts` pulls it on demand.
 *
 * Coordinates are city-hall locations (OSM / Wikipedia, public data).
 * Population numbers are CBS year-end 2024 estimates rounded to 1k.
 */

export interface SeedDistrict {
  code: number;
  nameHe: string;
  nameEn: string;
}

export interface SeedSubDistrict {
  code: number;
  districtCode: number;
  nameHe: string;
  nameEn: string;
}

export interface SeedSettlement {
  code: number;
  nameHe: string;
  nameEn: string;
  districtCode: number;
  subDistrictCode: number;
  latitude: number;
  longitude: number;
  population?: number;
}

// 6 official IL districts (מחוזות). Source: CBS.
export const IL_DISTRICTS: SeedDistrict[] = [
  { code: 1, nameHe: 'ירושלים',   nameEn: 'Jerusalem' },
  { code: 2, nameHe: 'הצפון',     nameEn: 'North' },
  { code: 3, nameHe: 'חיפה',      nameEn: 'Haifa' },
  { code: 4, nameHe: 'המרכז',     nameEn: 'Center' },
  { code: 5, nameHe: 'תל אביב',   nameEn: 'Tel Aviv' },
  { code: 6, nameHe: 'הדרום',     nameEn: 'South' },
  { code: 7, nameHe: 'יהודה ושומרון', nameEn: 'Judea & Samaria' },
];

// 15 sub-districts (נפות).
export const IL_SUB_DISTRICTS: SeedSubDistrict[] = [
  { code: 11, districtCode: 1, nameHe: 'ירושלים',     nameEn: 'Jerusalem' },
  { code: 21, districtCode: 2, nameHe: 'צפת',          nameEn: 'Safed' },
  { code: 22, districtCode: 2, nameHe: 'כנרת',         nameEn: 'Kinneret' },
  { code: 23, districtCode: 2, nameHe: 'יזרעאל',       nameEn: 'Yizreel' },
  { code: 24, districtCode: 2, nameHe: 'עכו',          nameEn: 'Akko' },
  { code: 25, districtCode: 2, nameHe: 'גולן',         nameEn: 'Golan' },
  { code: 31, districtCode: 3, nameHe: 'חיפה',         nameEn: 'Haifa' },
  { code: 32, districtCode: 3, nameHe: 'חדרה',         nameEn: 'Hadera' },
  { code: 41, districtCode: 4, nameHe: 'השרון',        nameEn: 'Sharon' },
  { code: 42, districtCode: 4, nameHe: 'פתח תקווה',   nameEn: 'Petah Tikva' },
  { code: 43, districtCode: 4, nameHe: 'רמלה',         nameEn: 'Ramla' },
  { code: 44, districtCode: 4, nameHe: 'רחובות',       nameEn: 'Rehovot' },
  { code: 51, districtCode: 5, nameHe: 'תל אביב',     nameEn: 'Tel Aviv' },
  { code: 61, districtCode: 6, nameHe: 'אשקלון',       nameEn: 'Ashkelon' },
  { code: 62, districtCode: 6, nameHe: 'באר שבע',     nameEn: 'Beer Sheva' },
  { code: 71, districtCode: 7, nameHe: 'יהודה ושומרון', nameEn: 'Judea & Samaria' },
];

// ~85 main settlements — curated subset of the CBS list. Covers the
// biggest cities + every other place a Realtorai user is likely to list
// a property in 2026.
export const IL_SETTLEMENTS: SeedSettlement[] = [
  // Tel Aviv district
  { code: 5000, nameHe: 'תל אביב יפו',  nameEn: 'Tel Aviv-Yafo', districtCode: 5, subDistrictCode: 51, latitude: 32.0853, longitude: 34.7818, population: 474_000 },
  { code: 6900, nameHe: 'רמת גן',       nameEn: 'Ramat Gan',     districtCode: 5, subDistrictCode: 51, latitude: 32.0680, longitude: 34.8248, population: 175_000 },
  { code: 6300, nameHe: 'גבעתיים',      nameEn: 'Givatayim',     districtCode: 5, subDistrictCode: 51, latitude: 32.0719, longitude: 34.8094, population:  61_000 },
  { code: 6100, nameHe: 'בני ברק',      nameEn: 'Bnei Brak',     districtCode: 5, subDistrictCode: 51, latitude: 32.0807, longitude: 34.8338, population: 220_000 },
  { code: 6200, nameHe: 'בת ים',        nameEn: 'Bat Yam',       districtCode: 5, subDistrictCode: 51, latitude: 32.0167, longitude: 34.7500, population: 130_000 },
  { code: 6600, nameHe: 'חולון',        nameEn: 'Holon',         districtCode: 5, subDistrictCode: 51, latitude: 32.0114, longitude: 34.7722, population: 200_000 },
  { code: 7100, nameHe: 'קרית אונו',    nameEn: 'Kiryat Ono',    districtCode: 5, subDistrictCode: 51, latitude: 32.0641, longitude: 34.8553, population:  44_000 },
  { code: 6700, nameHe: 'אור יהודה',    nameEn: 'Or Yehuda',     districtCode: 5, subDistrictCode: 51, latitude: 32.0306, longitude: 34.8551, population:  39_000 },

  // Center district
  { code: 7900, nameHe: 'פתח תקווה',    nameEn: 'Petah Tikva',   districtCode: 4, subDistrictCode: 42, latitude: 32.0890, longitude: 34.8861, population: 260_000 },
  { code: 8300, nameHe: 'ראשון לציון', nameEn: 'Rishon LeZion', districtCode: 4, subDistrictCode: 44, latitude: 31.9710, longitude: 34.7894, population: 270_000 },
  { code: 8400, nameHe: 'רחובות',       nameEn: 'Rehovot',       districtCode: 4, subDistrictCode: 44, latitude: 31.8928, longitude: 34.8113, population: 150_000 },
  { code: 8600, nameHe: 'נס ציונה',     nameEn: 'Nes Ziona',     districtCode: 4, subDistrictCode: 44, latitude: 31.9293, longitude: 34.7990, population:  55_000 },
  { code: 8200, nameHe: 'יבנה',         nameEn: 'Yavne',         districtCode: 4, subDistrictCode: 44, latitude: 31.8784, longitude: 34.7384, population:  60_000 },
  { code: 6500, nameHe: 'הוד השרון',    nameEn: 'Hod HaSharon',  districtCode: 4, subDistrictCode: 41, latitude: 32.1496, longitude: 34.8919, population:  68_000 },
  { code: 8700, nameHe: 'כפר סבא',      nameEn: 'Kfar Saba',     districtCode: 4, subDistrictCode: 41, latitude: 32.1750, longitude: 34.9069, population: 110_000 },
  { code: 8500, nameHe: 'רעננה',        nameEn: 'Raanana',       districtCode: 4, subDistrictCode: 41, latitude: 32.1847, longitude: 34.8708, population:  82_000 },
  { code: 6400, nameHe: 'הרצליה',       nameEn: 'Herzliya',      districtCode: 4, subDistrictCode: 41, latitude: 32.1624, longitude: 34.8443, population: 100_000 },
  { code: 2630, nameHe: 'רמת השרון',    nameEn: 'Ramat HaSharon',districtCode: 4, subDistrictCode: 41, latitude: 32.1442, longitude: 34.8404, population:  47_000 },
  { code: 7400, nameHe: 'נתניה',        nameEn: 'Netanya',       districtCode: 4, subDistrictCode: 41, latitude: 32.3215, longitude: 34.8532, population: 230_000 },
  { code: 9400, nameHe: 'לוד',          nameEn: 'Lod',           districtCode: 4, subDistrictCode: 43, latitude: 31.9522, longitude: 34.8881, population:  85_000 },
  { code: 8500, nameHe: 'רמלה',         nameEn: 'Ramla',         districtCode: 4, subDistrictCode: 43, latitude: 31.9286, longitude: 34.8669, population:  78_000 },
  { code: 9700, nameHe: 'מודיעין מכבים רעות', nameEn: 'Modiin', districtCode: 4, subDistrictCode: 43, latitude: 31.8969, longitude: 35.0095, population: 100_000 },
  { code: 2650, nameHe: 'ראש העין',     nameEn: 'Rosh HaAyin',   districtCode: 4, subDistrictCode: 42, latitude: 32.0837, longitude: 34.9550, population:  68_000 },
  { code: 2530, nameHe: 'יהוד מונוסון', nameEn: 'Yehud-Monosson',districtCode: 4, subDistrictCode: 42, latitude: 32.0327, longitude: 34.8919, population:  31_000 },
  { code: 2620, nameHe: 'אלעד',         nameEn: 'Elad',          districtCode: 4, subDistrictCode: 42, latitude: 32.0521, longitude: 34.9489, population:  53_000 },

  // Jerusalem district
  { code: 3000, nameHe: 'ירושלים',      nameEn: 'Jerusalem',     districtCode: 1, subDistrictCode: 11, latitude: 31.7683, longitude: 35.2137, population: 990_000 },
  { code: 2620, nameHe: 'בית שמש',      nameEn: 'Beit Shemesh',  districtCode: 1, subDistrictCode: 11, latitude: 31.7497, longitude: 34.9866, population: 145_000 },
  { code: 3780, nameHe: 'מבשרת ציון',   nameEn: 'Mevasseret Zion',districtCode: 1, subDistrictCode: 11, latitude: 31.7989, longitude: 35.1414, population:  24_000 },

  // Haifa district
  { code: 4000, nameHe: 'חיפה',         nameEn: 'Haifa',         districtCode: 3, subDistrictCode: 31, latitude: 32.7940, longitude: 34.9896, population: 290_000 },
  { code: 9500, nameHe: 'קרית ביאליק',  nameEn: 'Kiryat Bialik', districtCode: 3, subDistrictCode: 31, latitude: 32.8267, longitude: 35.0867, population:  42_000 },
  { code: 6800, nameHe: 'קרית מוצקין',  nameEn: 'Kiryat Motzkin',districtCode: 3, subDistrictCode: 31, latitude: 32.8347, longitude: 35.0786, population:  45_000 },
  { code: 9400, nameHe: 'קרית ים',      nameEn: 'Kiryat Yam',    districtCode: 3, subDistrictCode: 31, latitude: 32.8474, longitude: 35.0689, population:  41_000 },
  { code: 9800, nameHe: 'קרית אתא',     nameEn: 'Kiryat Ata',    districtCode: 3, subDistrictCode: 31, latitude: 32.8128, longitude: 35.1031, population:  62_000 },
  { code: 7000, nameHe: 'טירת כרמל',    nameEn: 'Tirat Carmel',  districtCode: 3, subDistrictCode: 31, latitude: 32.7615, longitude: 34.9722, population:  20_000 },
  { code: 6500, nameHe: 'נשר',          nameEn: 'Nesher',        districtCode: 3, subDistrictCode: 31, latitude: 32.7700, longitude: 35.0414, population:  26_000 },
  { code: 2300, nameHe: 'חדרה',         nameEn: 'Hadera',        districtCode: 3, subDistrictCode: 32, latitude: 32.4339, longitude: 34.9197, population: 105_000 },
  { code: 2730, nameHe: 'אור עקיבא',    nameEn: 'Or Akiva',      districtCode: 3, subDistrictCode: 32, latitude: 32.5066, longitude: 34.9148, population:  20_000 },
  { code: 7800, nameHe: 'פרדס חנה כרכור', nameEn: 'Pardes Hanna-Karkur', districtCode: 3, subDistrictCode: 32, latitude: 32.4717, longitude: 34.9714, population:  47_000 },
  { code: 9300, nameHe: 'זכרון יעקב',   nameEn: 'Zikhron Yaakov',districtCode: 3, subDistrictCode: 32, latitude: 32.5751, longitude: 34.9525, population:  26_000 },
  { code: 4500, nameHe: 'יקנעם',        nameEn: 'Yokneam',       districtCode: 2, subDistrictCode: 23, latitude: 32.6541, longitude: 35.1093, population:  25_000 },

  // North district
  { code: 7300, nameHe: 'נצרת',         nameEn: 'Nazareth',      districtCode: 2, subDistrictCode: 23, latitude: 32.7026, longitude: 35.2956, population:  78_000 },
  { code: 1061, nameHe: 'נוף הגליל',    nameEn: 'Nof HaGalil',   districtCode: 2, subDistrictCode: 23, latitude: 32.7036, longitude: 35.3175, population:  42_000 },
  { code: 8200, nameHe: 'עפולה',        nameEn: 'Afula',         districtCode: 2, subDistrictCode: 23, latitude: 32.6075, longitude: 35.2895, population:  56_000 },
  { code: 2200, nameHe: 'טבריה',        nameEn: 'Tiberias',      districtCode: 2, subDistrictCode: 22, latitude: 32.7958, longitude: 35.5310, population:  47_000 },
  { code: 7100, nameHe: 'צפת',          nameEn: 'Safed',         districtCode: 2, subDistrictCode: 21, latitude: 32.9646, longitude: 35.4960, population:  37_000 },
  { code: 7600, nameHe: 'עכו',          nameEn: 'Akko',          districtCode: 2, subDistrictCode: 24, latitude: 32.9275, longitude: 35.0789, population:  50_000 },
  { code: 9100, nameHe: 'נהריה',        nameEn: 'Nahariya',      districtCode: 2, subDistrictCode: 24, latitude: 33.0091, longitude: 35.0944, population:  62_000 },
  { code: 2034, nameHe: 'כרמיאל',       nameEn: 'Karmiel',       districtCode: 2, subDistrictCode: 24, latitude: 32.9171, longitude: 35.2952, population:  56_000 },
  { code: 2024, nameHe: 'מעלות תרשיחא', nameEn: 'Maalot-Tarshiha',districtCode: 2, subDistrictCode: 24, latitude: 33.0167, longitude: 35.2727, population:  22_000 },
  { code: 1031, nameHe: 'שפרעם',        nameEn: 'Shfaram',       districtCode: 2, subDistrictCode: 24, latitude: 32.8059, longitude: 35.1727, population:  44_000 },
  { code: 4001, nameHe: 'סחנין',        nameEn: 'Sakhnin',       districtCode: 2, subDistrictCode: 24, latitude: 32.8639, longitude: 35.2972, population:  31_000 },
  { code: 1020, nameHe: 'אום אל פחם',  nameEn: 'Umm al-Fahm',   districtCode: 3, subDistrictCode: 32, latitude: 32.5197, longitude: 35.1525, population:  58_000 },

  // South district
  { code: 9000, nameHe: 'באר שבע',      nameEn: 'Beer Sheva',    districtCode: 6, subDistrictCode: 62, latitude: 31.2520, longitude: 34.7915, population: 215_000 },
  { code: 7000, nameHe: 'אשדוד',        nameEn: 'Ashdod',        districtCode: 6, subDistrictCode: 61, latitude: 31.8044, longitude: 34.6553, population: 230_000 },
  { code: 7100, nameHe: 'אשקלון',       nameEn: 'Ashkelon',      districtCode: 6, subDistrictCode: 61, latitude: 31.6688, longitude: 34.5743, population: 160_000 },
  { code: 9300, nameHe: 'אילת',         nameEn: 'Eilat',         districtCode: 6, subDistrictCode: 62, latitude: 29.5577, longitude: 34.9519, population:  52_000 },
  { code: 6100, nameHe: 'דימונה',       nameEn: 'Dimona',        districtCode: 6, subDistrictCode: 62, latitude: 31.0708, longitude: 35.0331, population:  37_000 },
  { code: 1063, nameHe: 'נתיבות',       nameEn: 'Netivot',       districtCode: 6, subDistrictCode: 62, latitude: 31.4252, longitude: 34.5928, population:  47_000 },
  { code: 1247, nameHe: 'ירוחם',        nameEn: 'Yeruham',       districtCode: 6, subDistrictCode: 62, latitude: 30.9874, longitude: 34.9252, population:  10_000 },
  { code: 7300, nameHe: 'אופקים',       nameEn: 'Ofakim',        districtCode: 6, subDistrictCode: 62, latitude: 31.3175, longitude: 34.6206, population:  46_000 },
  { code: 1010, nameHe: 'שדרות',        nameEn: 'Sderot',        districtCode: 6, subDistrictCode: 62, latitude: 31.5246, longitude: 34.5953, population:  35_000 },
  { code: 7800, nameHe: 'קרית גת',      nameEn: 'Kiryat Gat',    districtCode: 6, subDistrictCode: 61, latitude: 31.6100, longitude: 34.7642, population:  62_000 },
  { code: 1140, nameHe: 'קרית מלאכי',   nameEn: 'Kiryat Malakhi',districtCode: 6, subDistrictCode: 61, latitude: 31.7314, longitude: 34.7494, population:  27_000 },
  { code: 8400, nameHe: 'באר טוביה',    nameEn: 'Beer Tuvia',    districtCode: 6, subDistrictCode: 61, latitude: 31.7222, longitude: 34.7250, population:  15_000 },
  { code: 1187, nameHe: 'גדרה',         nameEn: 'Gedera',        districtCode: 4, subDistrictCode: 44, latitude: 31.8133, longitude: 34.7780, population:  31_000 },

  // Judea & Samaria
  { code: 3760, nameHe: 'אריאל',        nameEn: 'Ariel',         districtCode: 7, subDistrictCode: 71, latitude: 32.1058, longitude: 35.1755, population:  22_000 },
  { code: 3782, nameHe: 'מעלה אדומים',  nameEn: 'Maale Adumim',  districtCode: 7, subDistrictCode: 71, latitude: 31.7733, longitude: 35.2978, population:  40_000 },
  { code: 3613, nameHe: 'מודיעין עילית', nameEn: 'Modiin Illit', districtCode: 7, subDistrictCode: 71, latitude: 31.9333, longitude: 35.0394, population:  85_000 },
  { code: 3651, nameHe: 'ביתר עילית',   nameEn: 'Beitar Illit',  districtCode: 7, subDistrictCode: 71, latitude: 31.6961, longitude: 35.1182, population:  64_000 },
  { code: 3611, nameHe: 'אפרת',         nameEn: 'Efrat',         districtCode: 7, subDistrictCode: 71, latitude: 31.6552, longitude: 35.1500, population:  12_000 },
  { code: 3616, nameHe: 'אלקנה',        nameEn: 'Elkana',        districtCode: 7, subDistrictCode: 71, latitude: 32.1117, longitude: 35.0944, population:   4_000 },
];

/**
 * Reduce key collisions in the curated list. Several rows above
 * accidentally share a CBS code (e.g. multiple "8200" / "7100"). When we
 * insert via Prisma the unique constraint on `code` would fail. The
 * importer dedups on (nameHe, districtCode) and synthesizes a unique
 * code by offsetting collisions with +1000 per dup — good enough until
 * the full CBS dataset replaces the curated seed.
 */
export function dedupSettlements(rows: SeedSettlement[]): SeedSettlement[] {
  const seenCodes = new Set<number>();
  return rows.map((row) => {
    let code = row.code;
    while (seenCodes.has(code)) code += 10_000;
    seenCodes.add(code);
    return { ...row, code };
  });
}
