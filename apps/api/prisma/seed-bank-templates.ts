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
  // ----------------------------------------------------------------------------
  // Banks without AcroForm: overlay placements derived from pdftotext -bbox
  // label scans (see /tmp/calibrate-banks.ts). Coordinates are heuristic —
  // each label was located, and we place the value 5-10pt to the left of
  // the label's left edge with align='right' so the Hebrew text reads
  // naturally toward the label. Calibration is "good enough to fill out the
  // form" rather than pixel-perfect — admins can fine-tune via a future
  // calibration UI or by editing this seed.
  //
  // Y values are in PDF-lib bottom-left coordinates (page_height - yMin - h).
  // ----------------------------------------------------------------------------
  {
    bankSlug: 'hapoalim',
    bankNameHe: 'בנק הפועלים',
    bankNameEn: 'Bank Hapoalim',
    pdfPath: 'hapoalim.pdf',
    overlay: {
      placements: [
        // Top borrower row — "שם" label at ~x=503, y(top)=130 → flippedY≈700
        { key: 'borrower1_name', page: 0, x: 495, y: 702, fontSize: 10, align: 'right' },
        { key: 'borrower1_id', page: 0, x: 260, y: 702, fontSize: 10, align: 'right' },
        // Advisor row — "מסמיכים את" header at y~215 → flippedY≈614
        { key: 'advisor_name', page: 0, x: 495, y: 600, fontSize: 10, align: 'right' },
        { key: 'advisor_id', page: 0, x: 260, y: 600, fontSize: 10, align: 'right' },
        { key: 'advisor_company_name', page: 0, x: 495, y: 580, fontSize: 10, align: 'right' },
        { key: 'advisor_company_id', page: 0, x: 260, y: 580, fontSize: 10, align: 'right' },
      ],
    },
    acroFormMap: {},
    notes: 'Heuristic calibration based on label positions. Admin can fine-tune.',
  },
  {
    bankSlug: 'leumi',
    bankNameHe: 'בנק לאומי',
    bankNameEn: 'Bank Leumi',
    pdfPath: 'leumi.pdf',
    overlay: {
      placements: [
        // Leumi inlines borrower into a single sentence:
        // "אנו הח״מ ________ ת.ז. ________, ________ ת.ז. ________"
        // The first blank starts at ~x=510, y=74 (top-line), flippedY≈760
        { key: 'borrower1_name', page: 0, x: 470, y: 762, fontSize: 9, align: 'right' },
        { key: 'borrower1_id', page: 0, x: 360, y: 762, fontSize: 9, align: 'right' },
        // Advisor (חברת הייעוץ ___ ח.פ. ___) on line ~88
        { key: 'advisor_company_name', page: 0, x: 350, y: 745, fontSize: 9, align: 'right' },
        { key: 'advisor_company_id', page: 0, x: 220, y: 745, fontSize: 9, align: 'right' },
        { key: 'advisor_name', page: 0, x: 470, y: 727, fontSize: 9, align: 'right' },
        { key: 'advisor_id', page: 0, x: 360, y: 727, fontSize: 9, align: 'right' },
      ],
    },
    acroFormMap: {},
    notes:
      'Inline-paragraph fill style ("אנו הח״מ ___ ת.ז. ___"). Heuristic calibration of underscore blanks.',
  },
  {
    bankSlug: 'mizrahi',
    bankNameHe: 'בנק מזרחי טפחות',
    bankNameEn: 'Mizrahi Tefahot Bank',
    pdfPath: 'mizrahi.pdf',
    overlay: {
      placements: [
        // Mizrahi has a borrower table near the top of page 1, columns:
        // שם | מספר מזהה | פרטי התקשרות (approximately).
        { key: 'borrower1_name', page: 0, x: 495, y: 695, fontSize: 10, align: 'right' },
        { key: 'borrower1_id', page: 0, x: 330, y: 695, fontSize: 10, align: 'right' },
        { key: 'borrower1_phone', page: 0, x: 180, y: 695, fontSize: 10, align: 'right' },
        // Advisor (single row)
        { key: 'advisor_name', page: 0, x: 495, y: 620, fontSize: 10, align: 'right' },
        { key: 'advisor_id', page: 0, x: 250, y: 620, fontSize: 10, align: 'right' },
      ],
    },
    acroFormMap: {},
    notes: 'Heuristic calibration based on label positions.',
  },
  {
    bankSlug: 'jerusalem',
    bankNameHe: 'בנק ירושלים',
    bankNameEn: 'Bank of Jerusalem',
    pdfPath: 'jerusalem.pdf',
    overlay: {
      placements: [
        // Jerusalem has a wide 5-column table at the top:
        // שם | מספר ת.ז. | כתובת מגורים | מס׳ טלפון | E-Mail
        { key: 'borrower1_name', page: 0, x: 540, y: 685, fontSize: 10, align: 'right' },
        { key: 'borrower1_id', page: 0, x: 420, y: 685, fontSize: 10, align: 'right' },
        { key: 'borrower1_address', page: 0, x: 320, y: 685, fontSize: 9, align: 'right' },
        { key: 'borrower1_phone', page: 0, x: 190, y: 685, fontSize: 10, align: 'right' },
        { key: 'borrower1_email', page: 0, x: 120, y: 685, fontSize: 9, align: 'right' },
        // Advisor: "מסמיכים את" row + columns שם | ת.ז.
        { key: 'advisor_name', page: 0, x: 500, y: 615, fontSize: 10, align: 'right' },
        { key: 'advisor_id', page: 0, x: 300, y: 615, fontSize: 10, align: 'right' },
      ],
    },
    acroFormMap: {},
    notes: '4-page form, top table has wider borrower row. Heuristic calibration.',
  },
  {
    bankSlug: 'fibi',
    bankNameHe: 'הבנק הבינלאומי',
    bankNameEn: 'First International Bank',
    pdfPath: 'fibi.pdf',
    overlay: {
      placements: [
        // FIBI is an advisor-confirmation form — only advisor data + date.
        // The customer's POA is attached separately.
        { key: 'date', page: 0, x: 470, y: 760, fontSize: 10, align: 'left' },
        { key: 'advisor_name', page: 1, x: 400, y: 100, fontSize: 10, align: 'right' },
        { key: 'advisor_id', page: 1, x: 250, y: 100, fontSize: 10, align: 'right' },
      ],
    },
    acroFormMap: {},
    notes:
      'WARNING: advisor-confirmation form (not customer authorization). Use alongside a separate POA. Calibration approximate.',
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
