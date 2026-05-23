#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const SEED_TAG = 'DEMO_SEED_50';

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(path.resolve(__dirname, '..', '.env'));

const prisma = new PrismaClient();

const locations = [
  ['תל אביב', 'לב העיר', 'שינקין'],
  ['ירושלים', 'רחביה', 'עזה'],
  ['חיפה', 'כרמליה', 'היינריך היינה'],
  ['באר שבע', 'רמות', 'הכלנית'],
  ['ראשון לציון', 'נווה ים', 'הדייגים'],
  ['פתח תקווה', 'אם המושבות', 'זכרון יעקב'],
  ['נתניה', 'עיר ימים', 'בני ברמן'],
  ['אשדוד', 'המרינה', 'אקסודוס'],
  ['רמת גן', 'מרום נווה', 'תרצה'],
  ['גבעתיים', 'בורוכוב', 'כצנלסון'],
  ['חולון', 'ח-300', 'דגניה'],
  ['בת ים', 'פארק הים', 'יוחנן הסנדלר'],
  ['רחובות', 'רחובות ההולנדית', 'הר הצופים'],
  ['מודיעין', 'אבני חן', 'עמק זבולון'],
  ['כפר סבא', 'הירוקה', 'וייצמן'],
  ['רעננה', 'לב הפארק', 'הפרחים'],
  ['הרצליה', 'הרצליה הירוקה', 'הנשיא'],
  ['הוד השרון', 'מגדיאל', 'דרך רמתיים'],
  ['אשקלון', 'ברנע', 'יפה נוף'],
  ['אילת', 'שחמון', 'האלמוגים'],
  ['טבריה', 'קריית שמואל', 'הגליל'],
  ['נהריה', 'עין שרה', 'ויצמן'],
  ['קריית אונו', 'פסגת אונו', 'לוי אשכול'],
  ['בית שמש', 'רמת בית שמש', 'נחל לכיש'],
  ['חדרה', 'הפיאצה', 'הלל יפה'],
];

const coverImages = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
];

const conditions = ['new', 'excellent', 'good', 'needs_renovation'];
const highlights = [
  'מרפסת שמש, מעלית וחניה רשומה',
  'קרוב לרכבת קלה, בתי ספר ומרכז מסחרי',
  'מטבח משודרג, יחידת הורים ונוף פתוח',
  'בניין מטופח עם ממ"ד ומחסן',
  'מתאים למשפחה, משקיעים או זוג צעיר',
];

function buildProperty(index, office) {
  const [city, area, street] = locations[index % locations.length];
  const dealType = index % 2 === 0 ? 'sale' : 'rent';
  const rooms = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5][index % 8];
  const floor = index % 17;
  const condition = conditions[index % conditions.length];
  const imageIndex = index % coverImages.length;
  const price =
    dealType === 'sale'
      ? 1_280_000 + ((index * 185_000) % 5_700_000)
      : 3_900 + ((index * 420) % 12_500);

  return {
    tenantId: office.tenantId,
    officeId: office.id,
    dealType,
    city,
    area,
    street: `${street} ${index + 1}`,
    rooms,
    floor,
    price,
    condition,
    coverImageUrl: coverImages[imageIndex],
    galleryUrls: [
      coverImages[(imageIndex + 1) % coverImages.length],
      `https://picsum.photos/seed/realtorai-${index + 1}-living/1200/800`,
      `https://picsum.photos/seed/realtorai-${index + 1}-building/1200/800`,
    ],
    status: 'active',
    notes: `${SEED_TAG} | נכס הדגמה עבור שוק הנכסים הציבורי. ${highlights[index % highlights.length]}.`,
  };
}

async function main() {
  const office = await prisma.office.findFirst({
    where: { status: 'active' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, tenantId: true, name: true },
  });

  if (!office) {
    throw new Error('No active office found. Create an office before seeding demo properties.');
  }

  const removed = await prisma.property.deleteMany({
    where: {
      tenantId: office.tenantId,
      officeId: office.id,
      notes: { startsWith: SEED_TAG },
    },
  });

  const data = Array.from({ length: 50 }, (_, index) => buildProperty(index, office));
  await prisma.property.createMany({ data });

  const activeTotal = await prisma.property.count({ where: { status: 'active' } });
  console.log(`Seeded ${data.length} demo properties for ${office.name}. Removed ${removed.count}. Active total: ${activeTotal}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
