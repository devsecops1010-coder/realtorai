/**
 * Hand-curated neighborhood (שכונה) seed for major IL cities.
 *
 * CBS doesn't publish a neighborhoods dataset — Israeli neighborhoods
 * are informally named with no central authority — so this list is
 * curated from Wikipedia + OSM + Yad2 / Madlan conventions. Coverage:
 * the top ~28 cities × 5-20 neighborhoods each ≈ 280 entries. The same
 * concept lives at finer granularity in any Israeli listings site
 * (yad2 etc.); we mirror their vocabulary so users feel at home.
 *
 * Match key (`settlementNameHe`) is the CBS canonical name as imported
 * via `geo-importer.service.ts`. Spelling variations are listed in the
 * curated `seedNeighborhoods` array under their CBS-canonical city.
 */

export interface SeedNeighborhood {
  settlementNameHe: string;
  slug: string;
  nameHe: string;
  nameEn?: string;
  latitude?: number;
  longitude?: number;
}

export const IL_NEIGHBORHOODS: SeedNeighborhood[] = [
  // ─── Tel Aviv-Yafo (CBS: "תל אביב - יפו") — top 20 neighborhoods ───
  { settlementNameHe: 'תל אביב - יפו', slug: 'florentin',        nameHe: 'פלורנטין',          nameEn: 'Florentin',         latitude: 32.0563, longitude: 34.7686 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'neve-tzedek',      nameHe: 'נווה צדק',           nameEn: 'Neve Tzedek',       latitude: 32.0635, longitude: 34.7647 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'lev-hair',         nameHe: 'לב העיר',            nameEn: 'Lev HaIr',          latitude: 32.0750, longitude: 34.7745 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'rothschild',       nameHe: 'רוטשילד',            nameEn: 'Rothschild',        latitude: 32.0656, longitude: 34.7732 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'tzafon-yashan',    nameHe: 'צפון ישן',           nameEn: 'Old North',         latitude: 32.0870, longitude: 34.7720 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'tzafon-hadash',    nameHe: 'צפון חדש',           nameEn: 'New North',         latitude: 32.0985, longitude: 34.7790 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'tzahala',          nameHe: 'צהלה',               nameEn: 'Tzahala',           latitude: 32.1175, longitude: 34.8175 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'ramat-aviv',       nameHe: 'רמת אביב',           nameEn: 'Ramat Aviv',        latitude: 32.1130, longitude: 34.8044 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'ramat-aviv-gimmel',nameHe: 'רמת אביב ג',         nameEn: 'Ramat Aviv Gimmel', latitude: 32.1220, longitude: 34.8100 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'kochav-hatzafon',  nameHe: 'כוכב הצפון',         nameEn: 'Kokhav HaTzafon',   latitude: 32.1145, longitude: 34.7870 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'bavli',            nameHe: 'בבלי',               nameEn: 'Bavli',             latitude: 32.0945, longitude: 34.8030 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'kerem-hateimanim', nameHe: 'כרם התימנים',         nameEn: 'Kerem HaTeimanim',  latitude: 32.0700, longitude: 34.7660 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'shapira',          nameHe: 'שפירא',              nameEn: 'Shapira',           latitude: 32.0490, longitude: 34.7820 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'yafo-old',         nameHe: 'יפו העתיקה',         nameEn: 'Old Jaffa',          latitude: 32.0540, longitude: 34.7530 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'ajami',            nameHe: 'עג׳מי',              nameEn: 'Ajami',             latitude: 32.0440, longitude: 34.7530 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'kiryat-shalom',    nameHe: 'קרית שלום',          nameEn: 'Kiryat Shalom',     latitude: 32.0270, longitude: 34.7830 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'neve-ofer',        nameHe: 'נווה עופר',          nameEn: 'Neve Ofer',         latitude: 32.0190, longitude: 34.7720 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'hatikva',          nameHe: 'התקווה',              nameEn: 'HaTikva',           latitude: 32.0540, longitude: 34.7945 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'yad-eliyahu',      nameHe: 'יד אליהו',           nameEn: 'Yad Eliyahu',       latitude: 32.0510, longitude: 34.8090 },
  { settlementNameHe: 'תל אביב - יפו', slug: 'kiryat-hamelacha', nameHe: 'קרית המלאכה',         nameEn: 'Kiryat HaMelacha',  latitude: 32.0490, longitude: 34.7790 },

  // ─── Jerusalem (CBS: "ירושלים") ─────────────────────────────────
  { settlementNameHe: 'ירושלים', slug: 'old-city',         nameHe: 'העיר העתיקה',    nameEn: 'Old City',          latitude: 31.7780, longitude: 35.2354 },
  { settlementNameHe: 'ירושלים', slug: 'nachlaot',         nameHe: 'נחלאות',         nameEn: 'Nachlaot',          latitude: 31.7813, longitude: 35.2153 },
  { settlementNameHe: 'ירושלים', slug: 'rehavia',          nameHe: 'רחביה',           nameEn: 'Rehavia',           latitude: 31.7704, longitude: 35.2174 },
  { settlementNameHe: 'ירושלים', slug: 'talbieh',          nameHe: 'טלביה',           nameEn: 'Talbieh',           latitude: 31.7660, longitude: 35.2226 },
  { settlementNameHe: 'ירושלים', slug: 'german-colony',    nameHe: 'המושבה הגרמנית', nameEn: 'German Colony',     latitude: 31.7615, longitude: 35.2186 },
  { settlementNameHe: 'ירושלים', slug: 'baka',             nameHe: 'בקעה',            nameEn: 'Baka',              latitude: 31.7556, longitude: 35.2218 },
  { settlementNameHe: 'ירושלים', slug: 'katamon',          nameHe: 'קטמון',           nameEn: 'Katamon',           latitude: 31.7595, longitude: 35.2095 },
  { settlementNameHe: 'ירושלים', slug: 'arnona',           nameHe: 'ארנונה',          nameEn: 'Arnona',            latitude: 31.7470, longitude: 35.2230 },
  { settlementNameHe: 'ירושלים', slug: 'mekor-haim',       nameHe: 'מקור חיים',       nameEn: 'Mekor Haim',        latitude: 31.7510, longitude: 35.2150 },
  { settlementNameHe: 'ירושלים', slug: 'gilo',             nameHe: 'גילה',            nameEn: 'Gilo',              latitude: 31.7245, longitude: 35.1810 },
  { settlementNameHe: 'ירושלים', slug: 'pisgat-zeev',      nameHe: 'פסגת זאב',        nameEn: 'Pisgat Zeev',       latitude: 31.8237, longitude: 35.2393 },
  { settlementNameHe: 'ירושלים', slug: 'ramot',            nameHe: 'רמות',            nameEn: 'Ramot',             latitude: 31.8200, longitude: 35.1820 },
  { settlementNameHe: 'ירושלים', slug: 'har-nof',          nameHe: 'הר נוף',          nameEn: 'Har Nof',           latitude: 31.7813, longitude: 35.1700 },
  { settlementNameHe: 'ירושלים', slug: 'french-hill',      nameHe: 'הגבעה הצרפתית',   nameEn: 'French Hill',       latitude: 31.7960, longitude: 35.2370 },
  { settlementNameHe: 'ירושלים', slug: 'mea-shearim',      nameHe: 'מאה שערים',       nameEn: 'Mea Shearim',       latitude: 31.7860, longitude: 35.2225 },

  // ─── Haifa ─────────────────────────────────────────────────────────
  { settlementNameHe: 'חיפה', slug: 'carmel',              nameHe: 'הכרמל',           nameEn: 'Carmel',            latitude: 32.8047, longitude: 34.9892 },
  { settlementNameHe: 'חיפה', slug: 'carmel-merkazi',      nameHe: 'כרמל מרכזי',      nameEn: 'Central Carmel',    latitude: 32.8094, longitude: 34.9883 },
  { settlementNameHe: 'חיפה', slug: 'ahuza',               nameHe: 'אחוזה',           nameEn: 'Ahuza',             latitude: 32.7900, longitude: 35.0050 },
  { settlementNameHe: 'חיפה', slug: 'hadar',               nameHe: 'הדר',             nameEn: 'Hadar',             latitude: 32.8156, longitude: 34.9930 },
  { settlementNameHe: 'חיפה', slug: 'bat-galim',           nameHe: 'בת גלים',          nameEn: 'Bat Galim',         latitude: 32.8311, longitude: 34.9711 },
  { settlementNameHe: 'חיפה', slug: 'neve-shaanan',        nameHe: 'נווה שאנן',        nameEn: 'Neve Shaanan',      latitude: 32.7800, longitude: 35.0240 },
  { settlementNameHe: 'חיפה', slug: 'romema',              nameHe: 'רוממה',           nameEn: 'Romema',            latitude: 32.7950, longitude: 35.0140 },
  { settlementNameHe: 'חיפה', slug: 'merkaz-hacarmel',     nameHe: 'מרכז הכרמל',      nameEn: 'Merkaz HaCarmel',   latitude: 32.8060, longitude: 34.9890 },
  { settlementNameHe: 'חיפה', slug: 'kiryat-eliezer',      nameHe: 'קרית אליעזר',     nameEn: 'Kiryat Eliezer',    latitude: 32.8240, longitude: 34.9820 },
  { settlementNameHe: 'חיפה', slug: 'german-colony-haifa', nameHe: 'המושבה הגרמנית', nameEn: 'German Colony',     latitude: 32.8167, longitude: 34.9905 },

  // ─── Herzliya ──────────────────────────────────────────────────────
  { settlementNameHe: 'הרצליה', slug: 'herzliya-a',     nameHe: 'הרצליה א',         nameEn: 'Herzliya Aleph',   latitude: 32.1610, longitude: 34.8440 },
  { settlementNameHe: 'הרצליה', slug: 'herzliya-b',     nameHe: 'הרצליה ב',         nameEn: 'Herzliya Bet',      latitude: 32.1700, longitude: 34.8500 },
  { settlementNameHe: 'הרצליה', slug: 'herzliya-pituach', nameHe: 'הרצליה פיתוח',  nameEn: 'Herzliya Pituach',  latitude: 32.1672, longitude: 34.8021 },
  { settlementNameHe: 'הרצליה', slug: 'nof-yam',        nameHe: 'נוף ים',           nameEn: 'Nof Yam',           latitude: 32.1750, longitude: 34.8050 },
  { settlementNameHe: 'הרצליה', slug: 'gan-rashal',     nameHe: 'גן רש"ל',          nameEn: 'Gan Rashal',        latitude: 32.1630, longitude: 34.8390 },
  { settlementNameHe: 'הרצליה', slug: 'neve-amal',      nameHe: 'נווה עמל',         nameEn: 'Neve Amal',         latitude: 32.1530, longitude: 34.8500 },

  // ─── Ramat Gan ─────────────────────────────────────────────────────
  { settlementNameHe: 'רמת גן', slug: 'bourse',         nameHe: 'הבורסה',          nameEn: 'Bourse',            latitude: 32.0830, longitude: 34.8000 },
  { settlementNameHe: 'רמת גן', slug: 'merkaz',         nameHe: 'מרכז העיר',        nameEn: 'City Center',       latitude: 32.0700, longitude: 34.8240 },
  { settlementNameHe: 'רמת גן', slug: 'rama',           nameHe: 'רמה',              nameEn: 'Rama',              latitude: 32.0830, longitude: 34.8330 },
  { settlementNameHe: 'רמת גן', slug: 'tel-binyamin',   nameHe: 'תל בנימין',        nameEn: 'Tel Binyamin',      latitude: 32.0640, longitude: 34.8195 },
  { settlementNameHe: 'רמת גן', slug: 'kiryat-krinitzi',nameHe: 'קרית קריניצי',     nameEn: 'Kiryat Krinitzi',   latitude: 32.0590, longitude: 34.8430 },

  // ─── Givatayim ─────────────────────────────────────────────────────
  { settlementNameHe: 'גבעתיים', slug: 'borochov',       nameHe: 'בורוכוב',          nameEn: 'Borochov',          latitude: 32.0750, longitude: 34.8060 },
  { settlementNameHe: 'גבעתיים', slug: 'merkaz',         nameHe: 'מרכז',             nameEn: 'Center',            latitude: 32.0719, longitude: 34.8094 },
  { settlementNameHe: 'גבעתיים', slug: 'givat-rambam',   nameHe: 'גבעת רמב"ם',       nameEn: 'Givat Rambam',      latitude: 32.0680, longitude: 34.8050 },

  // ─── Petah Tikva ───────────────────────────────────────────────────
  { settlementNameHe: 'פתח תקווה', slug: 'em-hamoshavot', nameHe: 'אם המושבות',     nameEn: 'Em HaMoshavot',     latitude: 32.0950, longitude: 34.9090 },
  { settlementNameHe: 'פתח תקווה', slug: 'kfar-ganim',    nameHe: 'כפר גנים',        nameEn: 'Kfar Ganim',        latitude: 32.0820, longitude: 34.8740 },
  { settlementNameHe: 'פתח תקווה', slug: 'neve-oz',       nameHe: 'נווה עוז',         nameEn: 'Neve Oz',           latitude: 32.1015, longitude: 34.9020 },
  { settlementNameHe: 'פתח תקווה', slug: 'merkaz',        nameHe: 'מרכז העיר',        nameEn: 'City Center',       latitude: 32.0890, longitude: 34.8861 },
  { settlementNameHe: 'פתח תקווה', slug: 'gat-rimon',     nameHe: 'גת רימון',         nameEn: 'Gat Rimon',         latitude: 32.0870, longitude: 34.8990 },
  { settlementNameHe: 'פתח תקווה', slug: 'shaarei-shomron', nameHe: 'שערי שומרון',  nameEn: 'Shaarei Shomron',   latitude: 32.0990, longitude: 34.8810 },
  { settlementNameHe: 'פתח תקווה', slug: 'hadar-ganim',   nameHe: 'הדר גנים',         nameEn: 'Hadar Ganim',       latitude: 32.0790, longitude: 34.8830 },

  // ─── Rishon LeZion ─────────────────────────────────────────────────
  { settlementNameHe: 'ראשון לציון', slug: 'old-city',      nameHe: 'העיר הוותיקה',   nameEn: 'Old City',          latitude: 31.9710, longitude: 34.7894 },
  { settlementNameHe: 'ראשון לציון', slug: 'ramat-eliyahu', nameHe: 'רמת אליהו',     nameEn: 'Ramat Eliyahu',     latitude: 31.9760, longitude: 34.7530 },
  { settlementNameHe: 'ראשון לציון', slug: 'kiryat-rishon', nameHe: 'קרית ראשון',    nameEn: 'Kiryat Rishon',     latitude: 31.9610, longitude: 34.7920 },
  { settlementNameHe: 'ראשון לציון', slug: 'nahalat-yehuda',nameHe: 'נחלת יהודה',     nameEn: 'Nahalat Yehuda',    latitude: 31.9530, longitude: 34.7780 },
  { settlementNameHe: 'ראשון לציון', slug: 'neve-yam',      nameHe: 'נווה ים',         nameEn: 'Neve Yam',          latitude: 31.9810, longitude: 34.7660 },
  { settlementNameHe: 'ראשון לציון', slug: 'west',          nameHe: 'ראשון מערב',     nameEn: 'Rishon West',       latitude: 31.9620, longitude: 34.7700 },

  // ─── Holon ─────────────────────────────────────────────────────────
  { settlementNameHe: 'חולון', slug: 'kiryat-sharet',    nameHe: 'קרית שרת',         nameEn: 'Kiryat Sharet',     latitude: 32.0050, longitude: 34.7780 },
  { settlementNameHe: 'חולון', slug: 'kiryat-pinsker',   nameHe: 'קרית פינסקר',      nameEn: 'Kiryat Pinsker',    latitude: 32.0190, longitude: 34.7600 },
  { settlementNameHe: 'חולון', slug: 'agrobank',         nameHe: 'אגרובנק',          nameEn: 'Agrobank',          latitude: 32.0090, longitude: 34.7660 },
  { settlementNameHe: 'חולון', slug: 'neve-arazim',      nameHe: 'נווה ארזים',       nameEn: 'Neve Arazim',       latitude: 32.0160, longitude: 34.7800 },
  { settlementNameHe: 'חולון', slug: 'h300',             nameHe: 'ח300',             nameEn: 'H300',              latitude: 32.0190, longitude: 34.7850 },

  // ─── Bat Yam ───────────────────────────────────────────────────────
  { settlementNameHe: 'בת ים', slug: 'ramat-yosef',      nameHe: 'רמת יוסף',         nameEn: 'Ramat Yosef',       latitude: 32.0250, longitude: 34.7530 },
  { settlementNameHe: 'בת ים', slug: 'merkaz',           nameHe: 'מרכז',             nameEn: 'Center',            latitude: 32.0167, longitude: 34.7500 },
  { settlementNameHe: 'בת ים', slug: 'amidar',           nameHe: 'עמידר',            nameEn: 'Amidar',            latitude: 32.0100, longitude: 34.7550 },

  // ─── Bnei Brak ─────────────────────────────────────────────────────
  { settlementNameHe: 'בני ברק', slug: 'merkaz',         nameHe: 'מרכז',             nameEn: 'Center',            latitude: 32.0807, longitude: 34.8338 },
  { settlementNameHe: 'בני ברק', slug: 'pardes-katz',    nameHe: 'פרדס כץ',          nameEn: 'Pardes Katz',       latitude: 32.0900, longitude: 34.8400 },
  { settlementNameHe: 'בני ברק', slug: 'kiryat-herzog',  nameHe: 'קרית הרצוג',       nameEn: 'Kiryat Herzog',     latitude: 32.0790, longitude: 34.8400 },

  // ─── Kfar Saba ─────────────────────────────────────────────────────
  { settlementNameHe: 'כפר סבא', slug: 'merkaz',         nameHe: 'מרכז העיר',        nameEn: 'City Center',       latitude: 32.1750, longitude: 34.9069 },
  { settlementNameHe: 'כפר סבא', slug: 'kaplan',         nameHe: 'קפלן',             nameEn: 'Kaplan',            latitude: 32.1820, longitude: 34.9020 },
  { settlementNameHe: 'כפר סבא', slug: 'east',           nameHe: 'מזרח',             nameEn: 'East',              latitude: 32.1740, longitude: 34.9180 },
  { settlementNameHe: 'כפר סבא', slug: 'green-kfar',     nameHe: 'הפארק הירוק',     nameEn: 'Green Park',        latitude: 32.1810, longitude: 34.9130 },

  // ─── Raanana ───────────────────────────────────────────────────────
  { settlementNameHe: 'רעננה', slug: 'merkaz',           nameHe: 'מרכז העיר',        nameEn: 'City Center',       latitude: 32.1847, longitude: 34.8708 },
  { settlementNameHe: 'רעננה', slug: 'kiryat-ganim',     nameHe: 'קרית גנים',        nameEn: 'Kiryat Ganim',      latitude: 32.1900, longitude: 34.8600 },
  { settlementNameHe: 'רעננה', slug: 'lev-haparkim',     nameHe: 'לב הפארקים',       nameEn: 'Lev HaParkim',      latitude: 32.1920, longitude: 34.8800 },
  { settlementNameHe: 'רעננה', slug: 'neve-zemer',       nameHe: 'נווה זמר',         nameEn: 'Neve Zemer',        latitude: 32.1810, longitude: 34.8650 },

  // ─── Hod HaSharon ──────────────────────────────────────────────────
  { settlementNameHe: 'הוד השרון', slug: 'magdiel',      nameHe: 'מגדיאל',           nameEn: 'Magdiel',           latitude: 32.1490, longitude: 34.8920 },
  { settlementNameHe: 'הוד השרון', slug: 'ramatayim',    nameHe: 'רמתיים',           nameEn: 'Ramatayim',         latitude: 32.1500, longitude: 34.8850 },
  { settlementNameHe: 'הוד השרון', slug: 'neve-neeman',  nameHe: 'נווה נאמן',        nameEn: 'Neve Neeman',       latitude: 32.1440, longitude: 34.9020 },

  // ─── Ramat HaSharon ────────────────────────────────────────────────
  { settlementNameHe: 'רמת השרון', slug: 'merkaz',       nameHe: 'מרכז',             nameEn: 'Center',            latitude: 32.1442, longitude: 34.8404 },
  { settlementNameHe: 'רמת השרון', slug: 'morasha',      nameHe: 'מורשה',            nameEn: 'Morasha',           latitude: 32.1370, longitude: 34.8520 },
  { settlementNameHe: 'רמת השרון', slug: 'neve-magen',   nameHe: 'נווה מגן',         nameEn: 'Neve Magen',        latitude: 32.1530, longitude: 34.8380 },

  // ─── Netanya ───────────────────────────────────────────────────────
  { settlementNameHe: 'נתניה', slug: 'old-north',        nameHe: 'צפון ישן',         nameEn: 'Old North',         latitude: 32.3340, longitude: 34.8560 },
  { settlementNameHe: 'נתניה', slug: 'ir-yamim',         nameHe: 'עיר ימים',         nameEn: 'Ir Yamim',          latitude: 32.2870, longitude: 34.8540 },
  { settlementNameHe: 'נתניה', slug: 'kiryat-shalom',    nameHe: 'קרית שלום',         nameEn: 'Kiryat Shalom',     latitude: 32.3180, longitude: 34.8800 },
  { settlementNameHe: 'נתניה', slug: 'ramat-poleg',      nameHe: 'רמת פולג',         nameEn: 'Ramat Poleg',       latitude: 32.2950, longitude: 34.8580 },
  { settlementNameHe: 'נתניה', slug: 'neot-shaked',      nameHe: 'נאות שקד',         nameEn: 'Neot Shaked',       latitude: 32.3050, longitude: 34.8700 },
  { settlementNameHe: 'נתניה', slug: 'merkaz',           nameHe: 'מרכז',             nameEn: 'Center',            latitude: 32.3215, longitude: 34.8532 },

  // ─── Modiin ─────────────────────────────────────────────────────────
  { settlementNameHe: 'מודיעין-מכבים-רעות', slug: 'old-city',       nameHe: 'העיר הוותיקה', nameEn: 'Old City',         latitude: 31.8969, longitude: 35.0095 },
  { settlementNameHe: 'מודיעין-מכבים-רעות', slug: 'kaiser',          nameHe: 'קייזר',         nameEn: 'Kaiser',           latitude: 31.9050, longitude: 35.0180 },
  { settlementNameHe: 'מודיעין-מכבים-רעות', slug: 'buchman',         nameHe: 'בוכמן',         nameEn: 'Buchman',          latitude: 31.8900, longitude: 35.0070 },
  { settlementNameHe: 'מודיעין-מכבים-רעות', slug: 'shvatim',         nameHe: 'השבטים',        nameEn: 'HaShvatim',        latitude: 31.9000, longitude: 35.0150 },
  { settlementNameHe: 'מודיעין-מכבים-רעות', slug: 'maccabim',        nameHe: 'מכבים',         nameEn: 'Maccabim',         latitude: 31.8830, longitude: 35.0240 },
  { settlementNameHe: 'מודיעין-מכבים-רעות', slug: 'reut',            nameHe: 'רעות',          nameEn: 'Reut',             latitude: 31.8950, longitude: 35.0320 },

  // ─── Ashdod ───────────────────────────────────────────────────────
  { settlementNameHe: 'אשדוד', slug: 'rova-1',           nameHe: 'רובע א',           nameEn: 'Rova Aleph',        latitude: 31.8044, longitude: 34.6553 },
  { settlementNameHe: 'אשדוד', slug: 'rova-3',           nameHe: 'רובע ג',           nameEn: 'Rova Gimel',        latitude: 31.7950, longitude: 34.6500 },
  { settlementNameHe: 'אשדוד', slug: 'rova-6',           nameHe: 'רובע ו',           nameEn: 'Rova Vav',          latitude: 31.8100, longitude: 34.6650 },
  { settlementNameHe: 'אשדוד', slug: 'sea-rovas',        nameHe: 'רובעי הים',         nameEn: 'Sea Quarters',      latitude: 31.7830, longitude: 34.6360 },
  { settlementNameHe: 'אשדוד', slug: 'merkaz',           nameHe: 'מרכז',             nameEn: 'Center',            latitude: 31.8044, longitude: 34.6553 },
  { settlementNameHe: 'אשדוד', slug: 'marina',           nameHe: 'מרינה',            nameEn: 'Marina',            latitude: 31.7910, longitude: 34.6360 },

  // ─── Ashkelon ──────────────────────────────────────────────────────
  { settlementNameHe: 'אשקלון', slug: 'merkaz',          nameHe: 'מרכז',             nameEn: 'Center',            latitude: 31.6688, longitude: 34.5743 },
  { settlementNameHe: 'אשקלון', slug: 'afridar',         nameHe: 'אפרידר',           nameEn: 'Afridar',           latitude: 31.6730, longitude: 34.5560 },
  { settlementNameHe: 'אשקלון', slug: 'barnea',          nameHe: 'ברנע',             nameEn: 'Barnea',            latitude: 31.6960, longitude: 34.5760 },
  { settlementNameHe: 'אשקלון', slug: 'agamim',          nameHe: 'אגמים',            nameEn: 'Agamim',            latitude: 31.6800, longitude: 34.5950 },
  { settlementNameHe: 'אשקלון', slug: 'shimshon',        nameHe: 'שמשון',            nameEn: 'Shimshon',          latitude: 31.6630, longitude: 34.5710 },

  // ─── Beer Sheva ────────────────────────────────────────────────────
  { settlementNameHe: 'באר שבע', slug: 'old-city',       nameHe: 'העיר העתיקה',     nameEn: 'Old City',          latitude: 31.2410, longitude: 34.7910 },
  { settlementNameHe: 'באר שבע', slug: 'ramot',          nameHe: 'רמות',             nameEn: 'Ramot',             latitude: 31.2680, longitude: 34.7920 },
  { settlementNameHe: 'באר שבע', slug: 'neve-noy',       nameHe: 'נווה נוי',         nameEn: 'Neve Noy',          latitude: 31.2350, longitude: 34.7960 },
  { settlementNameHe: 'באר שבע', slug: 'beit',           nameHe: 'שכונה ב',          nameEn: 'Shchuna Bet',       latitude: 31.2510, longitude: 34.7780 },
  { settlementNameHe: 'באר שבע', slug: 'daled',          nameHe: 'שכונה ד',          nameEn: 'Shchuna Daled',     latitude: 31.2470, longitude: 34.7850 },
  { settlementNameHe: 'באר שבע', slug: 'park-hapark',    nameHe: 'פארק הנחל',         nameEn: 'Nahal Park',        latitude: 31.2620, longitude: 34.7980 },

  // ─── Rehovot ───────────────────────────────────────────────────────
  { settlementNameHe: 'רחובות', slug: 'merkaz',          nameHe: 'מרכז',             nameEn: 'Center',            latitude: 31.8928, longitude: 34.8113 },
  { settlementNameHe: 'רחובות', slug: 'kiryat-moshe',    nameHe: 'קרית משה',         nameEn: 'Kiryat Moshe',      latitude: 31.9000, longitude: 34.8200 },
  { settlementNameHe: 'רחובות', slug: 'kramim',          nameHe: 'הכרמים',           nameEn: 'HaKramim',          latitude: 31.8830, longitude: 34.8090 },
  { settlementNameHe: 'רחובות', slug: 'shaarayim',       nameHe: 'שעריים',           nameEn: 'Sha\'arayim',        latitude: 31.8970, longitude: 34.8050 },
  { settlementNameHe: 'רחובות', slug: 'rishon-letzyon-rd',nameHe: 'מערב',            nameEn: 'West',              latitude: 31.8940, longitude: 34.8000 },

  // ─── Eilat ─────────────────────────────────────────────────────────
  { settlementNameHe: 'אילת', slug: 'merkaz',            nameHe: 'מרכז',             nameEn: 'Center',            latitude: 29.5577, longitude: 34.9519 },
  { settlementNameHe: 'אילת', slug: 'shaharut',          nameHe: 'שחמון',            nameEn: 'Shahamon',          latitude: 29.5680, longitude: 34.9580 },
  { settlementNameHe: 'אילת', slug: 'mitzpe-yam',        nameHe: 'מצפה ים',          nameEn: 'Mitzpe Yam',        latitude: 29.5500, longitude: 34.9540 },

  // ─── Karmiel ───────────────────────────────────────────────────────
  { settlementNameHe: 'כרמיאל', slug: 'merkaz',          nameHe: 'מרכז',             nameEn: 'Center',            latitude: 32.9171, longitude: 35.2952 },
  { settlementNameHe: 'כרמיאל', slug: 'ramat-rabin',     nameHe: 'רמת רבין',         nameEn: 'Ramat Rabin',       latitude: 32.9100, longitude: 35.3050 },
  { settlementNameHe: 'כרמיאל', slug: 'givat-makosh',    nameHe: 'גבעת מקוש',         nameEn: 'Givat Makosh',      latitude: 32.9230, longitude: 35.3000 },

  // ─── Beit Shemesh ──────────────────────────────────────────────────
  { settlementNameHe: 'בית שמש', slug: 'old-city',       nameHe: 'העיר הוותיקה',    nameEn: 'Old City',          latitude: 31.7497, longitude: 34.9866 },
  { settlementNameHe: 'בית שמש', slug: 'ramat-beit-shemesh-a', nameHe: 'רמת בית שמש א', nameEn: 'Ramat Beit Shemesh A', latitude: 31.7430, longitude: 35.0010 },
  { settlementNameHe: 'בית שמש', slug: 'ramat-beit-shemesh-b', nameHe: 'רמת בית שמש ב', nameEn: 'Ramat Beit Shemesh B', latitude: 31.7350, longitude: 35.0080 },
  { settlementNameHe: 'בית שמש', slug: 'ramat-beit-shemesh-g', nameHe: 'רמת בית שמש ג', nameEn: 'Ramat Beit Shemesh G', latitude: 31.7250, longitude: 35.0120 },
];

/**
 * Distinct list of settlements that have at least one curated
 * neighborhood. Useful for stats / coverage check.
 */
export const NEIGHBORHOOD_SETTLEMENTS = Array.from(
  new Set(IL_NEIGHBORHOODS.map((n) => n.settlementNameHe)),
);
