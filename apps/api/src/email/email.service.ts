import { Injectable, Logger } from '@nestjs/common';
import { MockEmailProvider } from './providers/mock.provider';
import { ResendEmailProvider } from './providers/resend.provider';
import type { EmailMessage, EmailProvider, SentEmail } from './types';

/**
 * Email sending facade. Provider chosen from EMAIL_PROVIDER env at boot
 * (default `mock` for dev/tests). The env vars are read via process.env
 * directly because env.schema.ts is owned by the platform team and we
 * don't want to require a schema update just to wire a new provider.
 *
 * Templates are inline here (small, infrequent) instead of MJML/Handlebars
 * — keep it boring until volume demands more.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly provider: EmailProvider;
  private readonly fromAddress: string;
  private readonly webBase: string;

  constructor() {
    const choice = process.env.EMAIL_PROVIDER ?? 'mock';
    this.fromAddress = process.env.EMAIL_FROM ?? 'Realtorai <noreply@realtorai.local>';
    this.webBase = (process.env.WEB_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

    if (choice === 'resend') {
      const apiKey = process.env.RESEND_API_KEY ?? '';
      if (!apiKey) {
        this.logger.warn('RESEND_API_KEY missing — falling back to Mock provider');
        this.provider = new MockEmailProvider();
      } else {
        this.provider = new ResendEmailProvider(apiKey, this.fromAddress);
      }
    } else {
      this.provider = new MockEmailProvider();
    }

    this.logger.log(`Email provider: ${this.provider.name} (from=${this.fromAddress})`);
  }

  async send(msg: EmailMessage): Promise<SentEmail> {
    return this.provider.send(msg);
  }

  // --- Template helpers ------------------------------------------------

  /**
   * Sent when a user is invited. Includes a one-time link to set their
   * initial password. Plain text by default + minimal HTML to render the
   * CTA button.
   */
  async sendActivationInvite(args: {
    to: string;
    recipientName: string;
    inviterName: string;
    officeName: string;
    activationToken: string;
  }): Promise<SentEmail> {
    const link = `${this.webBase}/activate/${args.activationToken}`;
    const text = [
      `שלום ${args.recipientName},`,
      ``,
      `${args.inviterName} הזמין/ה אותך להצטרף ל-${args.officeName} ב-Realtorai.`,
      ``,
      `לחץ/י על הקישור הבא כדי להגדיר סיסמה ולהתחבר (תקף ל-7 ימים):`,
      link,
      ``,
      `אם לא ציפית להזמנה הזו, אפשר להתעלם מהאימייל הזה.`,
    ].join('\n');
    const html = activationHtml({ link, recipientName: args.recipientName, officeName: args.officeName });
    return this.send({
      to: args.to,
      subject: `הוזמנת ל-${args.officeName} ב-Realtorai`,
      text,
      html,
      category: 'invite',
    });
  }

  async sendPasswordReset(args: {
    to: string;
    recipientName: string;
    resetToken: string;
  }): Promise<SentEmail> {
    const link = `${this.webBase}/reset/${args.resetToken}`;
    const text = [
      `שלום ${args.recipientName},`,
      ``,
      `התקבלה בקשה לאיפוס הסיסמה לחשבון Realtorai שלך.`,
      ``,
      `לחץ/י על הקישור (תקף שעה אחת):`,
      link,
      ``,
      `אם לא ביקשת איפוס סיסמה, התעלם/י מהאימייל הזה — הסיסמה לא תשתנה.`,
    ].join('\n');
    const html = resetHtml({ link, recipientName: args.recipientName });
    return this.send({
      to: args.to,
      subject: 'איפוס סיסמה ל-Realtorai',
      text,
      html,
      category: 'password_reset',
    });
  }

  /**
   * Notifies the tenant owner when an admin suspended the account. The text
   * deliberately omits internal details (who suspended) — the audit log has
   * those if needed.
   */
  async sendTenantSuspended(args: {
    to: string;
    recipientName: string;
    tenantName: string;
    reason: string | null;
  }): Promise<SentEmail> {
    const text = [
      `שלום ${args.recipientName},`,
      ``,
      `החשבון של ${args.tenantName} ב-Realtorai הושעה.`,
      args.reason ? `סיבה: ${args.reason}` : '',
      ``,
      `במהלך תקופת ההשעיה לא ניתן יהיה להיכנס לפלטפורמה. נציג שלנו ייצור איתך קשר.`,
      `אם יש שאלות, ניתן להשיב לאימייל זה.`,
    ]
      .filter(Boolean)
      .join('\n');
    return this.send({
      to: args.to,
      subject: `החשבון של ${args.tenantName} הושעה`,
      text,
      html: suspendedHtml({ recipientName: args.recipientName, tenantName: args.tenantName, reason: args.reason }),
      category: 'tenant_suspended',
    });
  }

  async sendTenantReactivated(args: {
    to: string;
    recipientName: string;
    tenantName: string;
    note?: string | null;
  }): Promise<SentEmail> {
    const text = [
      `שלום ${args.recipientName},`,
      ``,
      `החשבון של ${args.tenantName} ב-Realtorai הופעל מחדש.`,
      args.note ? `הערה: ${args.note}` : '',
      ``,
      `אפשר להיכנס למערכת כרגיל: ${this.webBase}/login`,
    ]
      .filter(Boolean)
      .join('\n');
    return this.send({
      to: args.to,
      subject: `החשבון של ${args.tenantName} הופעל מחדש`,
      text,
      html: reactivatedHtml({
        recipientName: args.recipientName,
        tenantName: args.tenantName,
        note: args.note,
        webBase: this.webBase,
      }),
      category: 'tenant_reactivated',
    });
  }
}

function suspendedHtml(args: { recipientName: string; tenantName: string; reason: string | null }) {
  return `<!doctype html>
<html dir="rtl" lang="he"><body style="font-family:system-ui,sans-serif;background:#f7f7fa;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 12px;font-size:20px;color:#b91c1c">החשבון הושעה</h1>
    <p>שלום ${escapeHtml(args.recipientName)},</p>
    <p>החשבון של <strong>${escapeHtml(args.tenantName)}</strong> ב-Realtorai הושעה.</p>
    ${args.reason ? `<p style="background:#fef2f2;border-right:3px solid #b91c1c;padding:12px 14px;border-radius:6px"><strong>סיבה:</strong> ${escapeHtml(args.reason)}</p>` : ''}
    <p>במהלך תקופת ההשעיה לא ניתן יהיה להיכנס לפלטפורמה. נציג שלנו ייצור איתך קשר.</p>
    <p style="font-size:13px;color:#64748b">אם יש שאלות, ניתן להשיב ישירות לאימייל הזה.</p>
  </div>
</body></html>`;
}

function reactivatedHtml(args: {
  recipientName: string;
  tenantName: string;
  note?: string | null;
  webBase: string;
}) {
  return `<!doctype html>
<html dir="rtl" lang="he"><body style="font-family:system-ui,sans-serif;background:#f7f7fa;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 12px;font-size:20px;color:#047857">החשבון הופעל מחדש</h1>
    <p>שלום ${escapeHtml(args.recipientName)},</p>
    <p>החשבון של <strong>${escapeHtml(args.tenantName)}</strong> ב-Realtorai הופעל מחדש ופועל באופן רגיל.</p>
    ${args.note ? `<p style="background:#ecfdf5;border-right:3px solid #047857;padding:12px 14px;border-radius:6px"><strong>הערה:</strong> ${escapeHtml(args.note)}</p>` : ''}
    <p style="margin:24px 0">
      <a href="${args.webBase}/login" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">כניסה למערכת</a>
    </p>
  </div>
</body></html>`;
}

// Tiny RTL-aware HTML wrappers. Kept inline for now; pull into a templates
// file when we add more than two emails.
function activationHtml(args: { link: string; recipientName: string; officeName: string }) {
  return `<!doctype html>
<html dir="rtl" lang="he"><body style="font-family:system-ui,sans-serif;background:#f7f7fa;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 12px;font-size:20px">ברוך/ה הבא/ה ל-Realtorai</h1>
    <p>שלום ${escapeHtml(args.recipientName)},</p>
    <p>הוזמנת להצטרף ל-<strong>${escapeHtml(args.officeName)}</strong>. כדי להפעיל את החשבון ולהגדיר סיסמה, לחץ/י על הכפתור:</p>
    <p style="margin:24px 0">
      <a href="${args.link}" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">הפעלת החשבון</a>
    </p>
    <p style="font-size:13px;color:#64748b">הקישור תקף ל-7 ימים. אם הכפתור לא עובד, העתק את הכתובת:<br/><span dir="ltr">${args.link}</span></p>
  </div>
</body></html>`;
}

function resetHtml(args: { link: string; recipientName: string }) {
  return `<!doctype html>
<html dir="rtl" lang="he"><body style="font-family:system-ui,sans-serif;background:#f7f7fa;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:12px;padding:28px;border:1px solid #e5e7eb">
    <h1 style="margin:0 0 12px;font-size:20px">איפוס סיסמה</h1>
    <p>שלום ${escapeHtml(args.recipientName)},</p>
    <p>קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך. לחץ/י על הכפתור כדי להגדיר סיסמה חדשה:</p>
    <p style="margin:24px 0">
      <a href="${args.link}" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">איפוס סיסמה</a>
    </p>
    <p style="font-size:13px;color:#64748b">הקישור תקף שעה אחת. אם לא ביקשת איפוס — התעלם/י, הסיסמה לא תשתנה.</p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
