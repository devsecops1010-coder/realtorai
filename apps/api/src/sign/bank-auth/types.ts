/**
 * Stable logical keys used across every bank's authorization template.
 * Mapping to the bank's specific field/coordinate happens in BankAuthTemplate.
 *
 * Most banks use only borrower1_* + advisor_* + advisor_company_*; the
 * `borrower2_*` set is optional (couples, joint mortgages).
 */
export type BankAuthFieldKey =
  | 'borrower1_name'
  | 'borrower1_id'
  | 'borrower1_phone'
  | 'borrower1_email'
  | 'borrower1_address'
  | 'borrower1_existing_customer' // checkbox, value "true"|"false"
  | 'borrower2_name'
  | 'borrower2_id'
  | 'borrower2_phone'
  | 'borrower2_existing_customer'
  | 'advisor_name'
  | 'advisor_id'
  | 'advisor_phone'
  | 'advisor_company_name'
  | 'advisor_company_id'
  | 'advisor_license_number'
  | 'date';

export type BankAuthValues = Partial<Record<BankAuthFieldKey, string>>;

/**
 * Single placement instruction for the overlay renderer. Coordinates are in
 * PDF points, with origin at the bottom-left of the page (pdf-lib's convention).
 */
export interface OverlayPlacement {
  key: BankAuthFieldKey;
  page: number;
  x: number;
  y: number;
  fontSize?: number;
  maxWidth?: number;
  // 'right' = anchor at x and grow leftward — matches RTL form fields.
  // 'left' (default) = anchor at x and grow rightward.
  align?: 'left' | 'right' | 'center';
  // Optional override — set to the literal string drawn (e.g. "✓") when the
  // logical value resolves to "true"/"false" for a checkbox slot.
  truthyText?: string;
  falsyText?: string;
}

export interface BankAuthTemplateOverlay {
  // Array form simplifies seed scripts and admin UI. Empty array = template
  // not yet calibrated.
  placements: OverlayPlacement[];
}

export type AcroFormMap = Partial<Record<BankAuthFieldKey, string>>; // logical → PDF field name
