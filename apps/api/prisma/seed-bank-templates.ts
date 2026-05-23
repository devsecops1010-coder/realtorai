/**
 * Seed the 7 bank authorization templates.
 *
 * Discount + Mercantile use the same AcroForm structure (Mercantile is owned
 * by Discount). Their mapping is fully populated below — every borrower /
 * advisor field maps to a real PDFTextField, so generation is pixel-perfect.
 *
 * The other 5 banks (Hapoalim, Leumi, Mizrahi-Tefahot, Jerusalem, FIBI)
 * don't expose form fields. They ship with an empty `overlay` and need to
 * be calibrated manually — either by editing this seed with coordinates
 * measured from a PDF viewer, or via a future admin UI. The PDFs are still
 * usable right after seeding: the engine returns the unmodified base
 * template, which the user can fill in by hand and still send for signing.
 *
 * Idempotent on bankSlug.
 *
 * Run: pnpm --filter api db:seed:bank-templates
 */
import { PrismaClient, Prisma } from '@prisma/client';
import type { AcroFormMap, BankAuthTemplateOverlay } from '../src/sign/bank-auth/types';

const prisma = new PrismaClient();

interface Seed {
  bankSlug: string;
  bankNameHe: string;
  bankNameEn: string;
  pdfPath: string;
  overlay: BankAuthTemplateOverlay;
  acroFormMap: AcroFormMap;
  notes?: string;
}

// ----------------------------------------------------------------------------
// Discount — has 25 AcroForm fields. Mapping derived from field-position scan
// of the original PDF (see /tmp/scan-acroform-positions.ts).
//
// Top borrower table (y=694 row 1, y=677 row 2):
//   Text1.0/.1 → borrower 1/2 name (also appears at signature blocks lower)
//   Text2.0/.1 → borrower 1/2 ID
//   Text3.0/.1 → borrower 1/2 phone
//   Check Box4 / 42 → "לקוח הבנק?" yes/no per row
//
// Advisor row (y=597):
//   Text5.0 → name, Text6.0 → ID, Text7.0 → phone
//   Text8.0 → consulting company name, Text9.0 → consulting company ID
//
// Signature rows (y=513, 461):
//   The Text1.0 / Text1.1 widgets reappear at the bottom signature blocks
//   so they auto-mirror the names. Text10/11 = date.
// ----------------------------------------------------------------------------

const DISCOUNT_ACRO: AcroFormMap = {
  borrower1_name: 'Text1.0',
  borrower1_id: 'Text2.0',
  borrower1_phone: 'Text3.0',
  borrower2_name: 'Text1.1',
  borrower2_id: 'Text2.1',
  borrower2_phone: 'Text3.1',
  advisor_name: 'Text5.0',
  advisor_id: 'Text6.0',
  advisor_phone: 'Text7.0',
  advisor_company_name: 'Text8.0',
  advisor_company_id: 'Text9.0',
  date: 'Text10',
};

// Mercantile is a Discount subsidiary using the same form template — same
// field names. (Confirmed by visual inspection: both show "Author: Discount"
// in PDF metadata.) If a field name eventually diverges we'll override per row.
const MERCANTILE_ACRO: AcroFormMap = DISCOUNT_ACRO;

const SEEDS: Seed[] = [
  {
    bankSlug: 'discount',
    bankNameHe: 'בנק דיסקונט',
    bankNameEn: 'Discount Bank',
    pdfPath: 'discount.pdf',
    overlay: { placements: [] },
    acroFormMap: DISCOUNT_ACRO,
    notes: 'AcroForm-driven. 25 form fields mapped 1:1 to logical keys.',
  },
  {
    bankSlug: 'mercantile',
    bankNameHe: 'בנק מרכנתיל',
    bankNameEn: 'Mercantile Discount Bank',
    pdfPath: 'mercantile.pdf',
    overlay: { placements: [] },
    acroFormMap: MERCANTILE_ACRO,
    notes: 'Same template as Discount (parent company). AcroForm-driven.',
  },
  // ---- Banks without AcroForm: empty overlay, ready for calibration -------
  {
    bankSlug: 'hapoalim',
    bankNameHe: 'בנק הפועלים',
    bankNameEn: 'Bank Hapoalim',
    pdfPath: 'hapoalim.pdf',
    overlay: { placements: [] },
    acroFormMap: {},
    notes: 'No AcroForm. Needs coordinate calibration.',
  },
  {
    bankSlug: 'leumi',
    bankNameHe: 'בנק לאומי',
    bankNameEn: 'Bank Leumi',
    pdfPath: 'leumi.pdf',
    overlay: { placements: [] },
    acroFormMap: {},
    notes: 'No AcroForm. Uses "ייפוי כוח" terminology. Needs calibration.',
  },
  {
    bankSlug: 'mizrahi',
    bankNameHe: 'בנק מזרחי טפחות',
    bankNameEn: 'Mizrahi Tefahot Bank',
    pdfPath: 'mizrahi.pdf',
    overlay: { placements: [] },
    acroFormMap: {},
    notes: 'No AcroForm. Uses "כתב הסכמה" wording. Needs calibration.',
  },
  {
    bankSlug: 'jerusalem',
    bankNameHe: 'בנק ירושלים',
    bankNameEn: 'Bank of Jerusalem',
    pdfPath: 'jerusalem.pdf',
    overlay: { placements: [] },
    acroFormMap: {},
    notes: 'No AcroForm. 4-page form (כתב הסמכה + כתב הסכמה). Needs calibration.',
  },
  {
    bankSlug: 'fibi',
    bankNameHe: 'הבנק הבינלאומי',
    bankNameEn: 'First International Bank',
    pdfPath: 'fibi.pdf',
    overlay: { placements: [] },
    acroFormMap: {},
    notes:
      'No AcroForm. WARNING: this is an advisor-confirmation form, not a customer authorization. Use alongside a separate POA.',
  },
];

async function main() {
  for (const s of SEEDS) {
    await prisma.bankAuthTemplate.upsert({
      where: { bankSlug: s.bankSlug },
      create: {
        bankSlug: s.bankSlug,
        bankNameHe: s.bankNameHe,
        bankNameEn: s.bankNameEn,
        pdfPath: s.pdfPath,
        overlay: s.overlay as unknown as Prisma.InputJsonValue,
        acroFormMap: s.acroFormMap as unknown as Prisma.InputJsonValue,
        notes: s.notes ?? null,
        active: true,
      },
      update: {
        bankNameHe: s.bankNameHe,
        bankNameEn: s.bankNameEn,
        pdfPath: s.pdfPath,
        // Overlay + acroFormMap are intentionally re-written on each seed so
        // changes in this file roll out. If admin calibrated via UI in the
        // future, that change goes through a different code path.
        overlay: s.overlay as unknown as Prisma.InputJsonValue,
        acroFormMap: s.acroFormMap as unknown as Prisma.InputJsonValue,
        notes: s.notes ?? null,
      },
    });
    console.log(
      `  ✓ ${s.bankSlug.padEnd(11)} acroForm=${Object.keys(s.acroFormMap).length} overlay=${s.overlay.placements.length}`,
    );
  }
  console.log(`\nDone. ${SEEDS.length} bank templates upserted.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
