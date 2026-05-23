import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PDFCheckBox, PDFDocument, PDFTextField } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  AcroFormMap,
  BankAuthTemplateOverlay,
  BankAuthValues,
  OverlayPlacement,
} from './types';

const HEBREW_FONT_PATH = join(process.cwd(), 'assets/fonts/NotoSansHebrew-Regular.ttf');
const TEMPLATES_DIR = join(process.cwd(), 'storage/sign/templates');

/**
 * Renders a bank authorization PDF by overlaying values onto the original
 * template. Two strategies:
 *
 * 1. **AcroForm fill** (preferred) — when the template has machine-readable
 *    form fields (today: Discount). We call `PDFTextField.setText()` and
 *    `PDFCheckBox.check/uncheck`. The PDF reader handles layout, no font
 *    juggling needed. Most reliable.
 *
 * 2. **Overlay draw** (fallback) — when the template is just a printed form
 *    (the other 6 banks). We embed NotoSansHebrew via fontkit and use
 *    `page.drawText()` at recorded coordinates. RTL text rendering is fine
 *    in pdf-lib as long as the font has the glyphs.
 *
 * Both strategies can coexist on the same template — useful for AcroForm
 * docs that have a checkbox grid not exposed via form fields.
 */
@Injectable()
export class BankAuthPdfService {
  private readonly logger = new Logger(BankAuthPdfService.name);
  private hebrewFontBytes: Buffer | null = null;

  private async loadHebrewFont(): Promise<Buffer> {
    if (!this.hebrewFontBytes) {
      this.hebrewFontBytes = await readFile(HEBREW_FONT_PATH);
    }
    return this.hebrewFontBytes;
  }

  /**
   * Renders the filled PDF.
   * @param templatePdfRelPath — like 'discount.pdf'. Resolved under storage/sign/templates/.
   * @param overlay — array of placements (may be empty if AcroForm covers everything).
   * @param acroFormMap — logical key → PDF field name (may be empty).
   * @param values — actual values to fill.
   */
  async render(args: {
    templatePdfRelPath: string;
    overlay: BankAuthTemplateOverlay;
    acroFormMap: AcroFormMap;
    values: BankAuthValues;
  }): Promise<Buffer> {
    const pdfPath = join(TEMPLATES_DIR, args.templatePdfRelPath);
    let pdfBytes: Buffer;
    try {
      pdfBytes = await readFile(pdfPath);
    } catch {
      throw new NotFoundException(`Template PDF not found at ${pdfPath}`);
    }

    const pdf = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });

    // Register fontkit + embed Hebrew font once. Even AcroForm flows need this
    // so we can hand the form a font that supports Hebrew — without it,
    // setText() with Hebrew values causes WinAnsi encoding errors when the
    // PDF is saved (the form tries to regenerate appearance streams using
    // Helvetica, which doesn't know about Hebrew glyphs).
    pdf.registerFontkit(fontkit);
    const fontBytes = await this.loadHebrewFont();
    // subset:false — every Hebrew character we set might come from a
    // different field, so subsetting risks dropping glyphs that pdf-lib
    // doesn't observe until appearance generation. The file size cost is
    // ~25KB which is acceptable.
    const hebrewFont = await pdf.embedFont(fontBytes, { subset: false });

    // 1. AcroForm fill — set each mapped field that has a value.
    if (Object.keys(args.acroFormMap).length > 0) {
      const form = pdf.getForm();
      for (const [logicalKey, fieldName] of Object.entries(args.acroFormMap)) {
        const value = args.values[logicalKey as keyof BankAuthValues];
        if (value === undefined || value === null || value === '') continue;
        if (!fieldName) continue;
        try {
          const field = form.getFieldMaybe(fieldName);
          if (!field) {
            this.logger.warn(`AcroForm field '${fieldName}' (key ${logicalKey}) not found`);
            continue;
          }
          if (field instanceof PDFTextField) {
            field.setText(String(value));
          } else if (field instanceof PDFCheckBox) {
            // Treat any truthy non-"false" string as "checked"
            if (String(value).toLowerCase() === 'true' || value === '1' || value === 'on') {
              field.check();
            } else {
              field.uncheck();
            }
          }
        } catch (e) {
          this.logger.warn(
            `Skipping AcroForm fill for ${logicalKey} → ${fieldName}: ${(e as Error).message}`,
          );
        }
      }
      // Regenerate field appearances using the Hebrew-capable font. Without
      // this, pdf-lib's default Helvetica chokes on Hebrew chars at save().
      try {
        form.updateFieldAppearances(hebrewFont);
      } catch (e) {
        this.logger.warn(`updateFieldAppearances failed: ${(e as Error).message}`);
      }
      // Flatten so the values become permanent rather than editable form fields.
      // Without flattening, viewers would let the signer edit our pre-fill.
      try {
        form.flatten();
      } catch (e) {
        // If flatten fails (rare — only on damaged forms), leave the fields
        // editable. The values are still in the field dict + appearance,
        // so a signer can see them; they're just not locked.
        this.logger.warn(`form.flatten() failed: ${(e as Error).message}`);
      }
    }

    // 2. Overlay draw — draws text at recorded coordinates on top of the
    // unmodified template. Used by banks that don't ship form fields.
    for (const p of args.overlay.placements) {
      const raw = args.values[p.key];
      if (raw === undefined || raw === null || raw === '') {
        continue;
      }
      const text = this.resolveCheckboxText(p, raw);
      if (text === null) continue;

      const page = pdf.getPage(p.page);
      const fontSize = p.fontSize ?? 11;
      const width = hebrewFont.widthOfTextAtSize(text, fontSize);
      let x = p.x;
      if (p.align === 'right') x = p.x - width;
      else if (p.align === 'center') x = p.x - width / 2;

      page.drawText(text, {
        x,
        y: p.y,
        size: fontSize,
        font: hebrewFont,
      });
    }

    const out = await pdf.save();
    return Buffer.from(out);
  }

  /**
   * Determines the rendered text for a placement. Most placements use the
   * raw value as-is. Checkbox-like placements use truthyText/falsyText.
   */
  private resolveCheckboxText(p: OverlayPlacement, raw: string): string | null {
    if (p.truthyText !== undefined || p.falsyText !== undefined) {
      const truthy = ['true', '1', 'yes', 'on', 'כן'].includes(raw.toLowerCase());
      const t = truthy ? p.truthyText : p.falsyText;
      return t ?? null;
    }
    return raw;
  }
}
