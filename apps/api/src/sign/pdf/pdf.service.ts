import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createHash } from 'node:crypto';

export interface AuditEventForPdf {
  timestamp: Date;
  eventType: string;
  description: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface EmbedSignatureArgs {
  /** Original PDF bytes */
  pdfBytes: Buffer;
  /** PNG bytes of the canvas signature */
  signaturePng: Buffer;
  /** Signer + verification details for the audit page */
  signer: {
    name: string;
    email: string;
    phone?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    signedAt: Date;
  };
  /** Hash of the *original* PDF — recorded on the audit page */
  originalHash: string;
  /** Audit trail entries to render in chronological order */
  events: AuditEventForPdf[];
}

export interface EmbedResult {
  signedPdfBytes: Buffer;
  signedPdfHash: string;
}

/**
 * Stamps a signature image onto the last page of the input PDF and appends
 * an audit-trail page at the very end. Returns the new bytes + their hash
 * (the value we store as `signed_document_hash` for tamper-evidence).
 *
 * Notes:
 *  - We deliberately place the signature in the bottom-right of the last
 *    page. A future enhancement is "drag signature anywhere" with the user
 *    picking the coordinates on the canvas; data model already supports it.
 *  - All text in the audit page is in English to avoid pdf-lib font issues
 *    with the default Helvetica — Hebrew glyphs would require embedding a
 *    Hebrew font (e.g. Noto Sans Hebrew). Phase-2 task.
 */
@Injectable()
export class SignPdfService {
  computeHash(bytes: Buffer): string {
    return createHash('sha256').update(bytes).digest('hex');
  }

  async embedSignatureAndAudit(args: EmbedSignatureArgs): Promise<EmbedResult> {
    const pdf = await PDFDocument.load(args.pdfBytes, { ignoreEncryption: true });

    // 1. Stamp the signature on the last page (bottom-right).
    const pages = pdf.getPages();
    const lastPage = pages[pages.length - 1];
    const { width: pageW, height: pageH } = lastPage.getSize();
    const signaturePng = await pdf.embedPng(args.signaturePng);
    const sigW = 180;
    const sigH = sigW * (signaturePng.height / signaturePng.width);
    // Bottom-right with 36pt margin
    lastPage.drawImage(signaturePng, {
      x: pageW - sigW - 36,
      y: 36,
      width: sigW,
      height: sigH,
    });
    // Small caption under the signature
    const helv = await pdf.embedFont(StandardFonts.Helvetica);
    lastPage.drawText(`Signed by ${toAscii(args.signer.name)}`, {
      x: pageW - sigW - 36,
      y: 24,
      size: 9,
      font: helv,
      color: rgb(0.3, 0.3, 0.3),
    });
    lastPage.drawText(args.signer.signedAt.toISOString(), {
      x: pageW - sigW - 36,
      y: 12,
      size: 8,
      font: helv,
      color: rgb(0.5, 0.5, 0.5),
    });

    // 2. Append the audit-trail page.
    this.drawAuditPage(pdf, helv, args);

    // 3. Save + hash.
    const bytes = Buffer.from(await pdf.save());
    return { signedPdfBytes: bytes, signedPdfHash: this.computeHash(bytes) };
  }

  private drawAuditPage(
    pdf: PDFDocument,
    helv: import('pdf-lib').PDFFont,
    args: EmbedSignatureArgs,
  ) {
    const page = pdf.addPage();
    const { width, height } = page.getSize();
    let y = height - 60;

    // pdf-lib's default Helvetica uses WinAnsi encoding which cannot
    // render Hebrew (or any non-Latin-1) characters. We sanitize every
    // string before drawing. Phase-2 fix: embed Noto Sans Hebrew via
    // fontkit so the audit page renders the signer's real name in Hebrew.
    const safe = (s: string) => toAscii(s);

    const heading = (text: string, size = 14) => {
      page.drawText(safe(text), { x: 50, y, size, font: helv, color: rgb(0, 0, 0) });
      y -= size + 8;
    };
    const line = (label: string, value: string) => {
      page.drawText(`${label}:`, { x: 50, y, size: 10, font: helv, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(safe(value), { x: 170, y, size: 10, font: helv, color: rgb(0, 0, 0) });
      y -= 14;
    };

    heading('Signature Audit Trail', 18);
    y -= 4;

    heading('Signer', 12);
    line('Name', args.signer.name);
    line('Email', args.signer.email);
    if (args.signer.phone) line('Phone', args.signer.phone);
    line('Signed at (UTC)', args.signer.signedAt.toISOString());
    if (args.signer.ipAddress) line('IP', args.signer.ipAddress);
    if (args.signer.userAgent) line('User agent', truncate(args.signer.userAgent, 80));
    y -= 8;

    heading('Document integrity', 12);
    line('Original SHA-256', args.originalHash);
    page.drawText('Signed SHA-256: (computed after this page is rendered)', {
      x: 50,
      y,
      size: 9,
      font: helv,
      color: rgb(0.45, 0.45, 0.45),
    });
    y -= 14;
    y -= 8;

    heading('Event log', 12);
    // Each event = two lines. Stop when we run out of vertical room and add a new page.
    for (const ev of args.events) {
      if (y < 80) {
        // Continue on a new page.
        const next = pdf.addPage();
        const sz = next.getSize();
        y = sz.height - 60;
      }
      page.drawText(`[${ev.timestamp.toISOString()}]  ${ev.eventType}`, {
        x: 50,
        y,
        size: 9,
        font: helv,
        color: rgb(0, 0, 0),
      });
      y -= 11;
      page.drawText(truncate(toAscii(ev.description), 110), {
        x: 60,
        y,
        size: 8,
        font: helv,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 8;
      if (ev.ipAddress || ev.userAgent) {
        page.drawText(
          [
            ev.ipAddress ? `IP ${ev.ipAddress}` : '',
            ev.userAgent ? `UA ${truncate(toAscii(ev.userAgent), 60)}` : '',
          ]
            .filter(Boolean)
            .join('  ·  '),
          { x: 60, y, size: 7, font: helv, color: rgb(0.55, 0.55, 0.55) },
        );
        y -= 8;
      }
      y -= 3;
    }
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}...` : s;
}

/**
 * pdf-lib's default Helvetica can only encode WinAnsi (≈Latin-1). Anything
 * else throws at draw time. We replace unsupported chars with '?' so the
 * audit page renders even when the signer's name is in Hebrew / Arabic /
 * CJK. The original name is preserved in the DB + `signatures` table.
 *
 * Phase-2 fix: embed Noto Sans Hebrew via pdf-lib's `embedFont` + fontkit.
 */
function toAscii(s: string): string {
  // pdf-lib's default Helvetica handles WinAnsi only. Replace common
  // Unicode punctuation with ASCII, then sweep anything beyond Latin-1
  // (Hebrew, Arabic, CJK) with '?'. Original strings are preserved in DB.
  return s
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\xFF]/g, '?');
}
