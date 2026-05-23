import { Injectable, NotFoundException } from '@nestjs/common';
import { PropertyDealType, PropertyStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type IntegrationStatus = 'api_ready' | 'manual_ready' | 'needs_setup' | 'planned';
type IntegrationCategory = 'portal' | 'social' | 'invoice' | 'signature' | 'video' | 'website';

interface GrowthIntegration {
  key: string;
  label: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  mode: string;
  notes: string;
}

interface PropertyForGrowth {
  id: string;
  dealType: PropertyDealType;
  city: string | null;
  area: string | null;
  street: string | null;
  rooms: unknown;
  floor: number | null;
  price: unknown;
  status: PropertyStatus;
  notes: string | null;
  createdAt: Date;
  ownerLead?: { fullName: string | null; phone: string | null; email?: string | null } | null;
  office?: { name: string } | null;
}

const INTEGRATIONS: GrowthIntegration[] = [
  {
    key: 'office_public_site',
    label: 'אתר נכסים עצמאי למשרד',
    category: 'website',
    status: 'manual_ready',
    mode: 'דפי נכס ודפי אזור מתוך הנתונים במערכת',
    notes: 'השלב הבא הוא יצירת route ציבורי לכל נכס ומיפוי דומיין למשרד.',
  },
  {
    key: 'yad2',
    label: 'יד2',
    category: 'portal',
    status: 'planned',
    mode: 'Feed/API רשמי או יצוא ידני',
    notes: 'לא לפרסם באמצעות scraping. צריך הסכם/ממשק רשמי או קובץ יצוא.',
  },
  {
    key: 'madlan',
    label: 'מדלן',
    category: 'portal',
    status: 'planned',
    mode: 'Feed/API רשמי או יצוא ידני',
    notes: 'אותו עיקרון: חיבור מורשה בלבד, עם fallback לייצוא.',
  },
  {
    key: 'facebook',
    label: 'Facebook Pages',
    category: 'social',
    status: 'planned',
    mode: 'Meta Graph API לאחר App Review',
    notes: 'דורש OAuth והרשאות עמודים לכל משרד.',
  },
  {
    key: 'instagram',
    label: 'Instagram Business/Reels',
    category: 'social',
    status: 'planned',
    mode: 'Instagram Graph API / Content Publishing',
    notes: 'דורש חשבון Business/Creator מחובר לעמוד Meta.',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    category: 'social',
    status: 'planned',
    mode: 'TikTok Content Posting API',
    notes: 'דורש אפליקציית Developer ואישור Production.',
  },
  {
    key: 'youtube_shorts',
    label: 'YouTube Shorts',
    category: 'social',
    status: 'planned',
    mode: 'YouTube Data API upload',
    notes: 'דורש OAuth לערוץ של המשרד.',
  },
  {
    key: 'google_business_profile',
    label: 'Google Business Profile',
    category: 'social',
    status: 'planned',
    mode: 'Google Business Profile Posts',
    notes: 'מתאים לפרסום פוסטים מקומיים לפי סניף.',
  },
  {
    key: 'digital_signature',
    label: 'חתימה דיגיטלית',
    category: 'signature',
    // In-house Sign module (apps/api/src/sign/*) — no external provider.
    // PDF upload → email/OTP-verified signer flow → audit trail page
    // embedded in the signed PDF → SHA-256 hash of the signed file.
    status: 'api_ready',
    mode: 'מנוע פנימי: PDF + OTP + audit trail',
    notes: 'מודול חתימה פנימי במערכת (Sign Module). תומך בהעלאת PDF, אימות חותם ב-OTP, רישום audit מלא ושמירת מסמך חתום עם hash. נוסחי חוזים צריכים אישור עורך דין לפני שליחה.',
  },
  {
    key: 'invoice_provider',
    label: 'חשבוניות וקבלות',
    category: 'invoice',
    status: 'needs_setup',
    mode: 'חיבור לספק חשבוניות ישראלי',
    notes: 'המערכת תבצע request לספק חיצוני, כולל תמיכה במספרי הקצאה כשנדרש.',
  },
  {
    key: 'ai_video_studio',
    label: 'סטודיו סרטוני AI',
    category: 'video',
    status: 'manual_ready',
    mode: 'תסריט, shot list, קריינות וכתוביות',
    notes: 'השלב הבא הוא חיבור ספק וידאו/FFmpeg/קול.',
  },
];

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [properties, activeProperties, draftProperties, saleProperties, rentProperties] = await Promise.all([
      this.prisma.scoped.property.count(),
      this.prisma.scoped.property.count({ where: { status: PropertyStatus.active } }),
      this.prisma.scoped.property.count({ where: { status: PropertyStatus.draft } }),
      this.prisma.scoped.property.count({ where: { dealType: PropertyDealType.sale } }),
      this.prisma.scoped.property.count({ where: { dealType: PropertyDealType.rent } }),
    ]);

    const recentProperties = await this.prisma.scoped.property.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        ownerLead: { select: { fullName: true, phone: true } },
        office: { select: { name: true } },
      },
    });

    return {
      mission: 'להקטין תלות בפורטלים, להפוך כל נכס למכונת תוכן ולסגור חוזה+חשבונית מתוך אותה מערכת.',
      stats: {
        properties,
        activeProperties,
        draftProperties,
        saleProperties,
        rentProperties,
        integrationsReadyForPlanning: INTEGRATIONS.length,
      },
      pipeline: [
        'קליטת נכס ותמונות',
        'העשרת אזור ונכס',
        'דף נכס + דף אזור',
        'טיוטות פוסטים וסרטון',
        'אישור מתווך',
        'פרסום אורגני ומתוזמן',
        'לידים חוזרים ל-CRM',
        'חוזה דיגיטלי',
        'חתימה',
        'חשבונית',
      ],
      integrations: INTEGRATIONS,
      recentProperties: recentProperties.map((p) => this.propertyCard(p as PropertyForGrowth)),
    };
  }

  async propertyLaunchPlan(id: string) {
    const property = await this.findProperty(id);
    return this.buildLaunchPlan(property);
  }

  async draftCampaign(id: string, platforms?: string[]) {
    const property = await this.findProperty(id);
    const plan = this.buildLaunchPlan(property);
    const selected = platforms?.length
      ? plan.socialQueue.filter((p) => platforms.includes(p.platform))
      : plan.socialQueue;

    return {
      property: plan.property,
      approvalRequired: true,
      legalNotice: 'טיוטה בלבד. פרסום, חוזה, חתימה וחשבונית דורשים אישור משתמש וספקים מחוברים.',
      landingPage: plan.landingPage,
      posts: selected,
      videoBrief: plan.videoBrief,
      contractDraft: plan.contractFlow,
      invoiceFlow: plan.invoiceFlow,
    };
  }

  private async findProperty(id: string): Promise<PropertyForGrowth> {
    const property = await this.prisma.scoped.property.findFirst({
      where: { id },
      include: {
        ownerLead: { select: { fullName: true, phone: true, email: true } },
        office: { select: { name: true } },
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property as PropertyForGrowth;
  }

  private buildLaunchPlan(property: PropertyForGrowth) {
    const title = this.propertyTitle(property);
    const price = this.formatMoney(property.price);
    const location = [property.city, property.area, property.street].filter(Boolean).join(', ') || 'מיקום חסר';
    const dealLabel = property.dealType === PropertyDealType.sale ? 'מכירה' : 'השכרה';

    return {
      property: this.propertyCard(property),
      readiness: this.readiness(property),
      landingPage: {
        slug: this.slugFor(property),
        title,
        seoTitle: `${title} | ${property.office?.name ?? 'משרד תיווך'}`,
        description: `${dealLabel} ב${location}. ${price ? `מחיר: ${price}.` : 'מחיר יעודכן בהמשך.'}`,
        sections: ['תקציר נכס', 'גלריית תמונות', 'על האזור', 'מפת הגעה', 'טופס ליד', 'וואטסאפ'],
      },
      portals: [
        { portal: 'אתר המשרד', action: 'publish_page', status: 'ready_to_build' },
        { portal: 'יד2', action: 'export_or_api', status: 'requires_partner_access' },
        { portal: 'מדלן', action: 'export_or_api', status: 'requires_partner_access' },
        { portal: 'אתרים נוספים', action: 'feed_mapping', status: 'requires_mapping' },
      ],
      socialQueue: this.socialQueue(title, location, price),
      videoBrief: this.videoBrief(title, location, price, property),
      organicPlan: this.organicPlan(title),
      contractFlow: {
        template: property.dealType === PropertyDealType.sale ? 'seller_brokerage_agreement' : 'rental_brokerage_agreement',
        requiredFields: ['פרטי בעל הנכס', 'פרטי המשרד', 'כתובת הנכס', 'עמלה', 'תקופת בלעדיות', 'תאריך חתימה'],
        signatureSteps: ['יצירת PDF', 'שליחה לחתימה', 'אימות זהות', 'audit trail', 'שמירת מסמך חתום'],
        status: property.ownerLead ? 'owner_data_available' : 'missing_owner_lead',
      },
      invoiceFlow: {
        trigger: 'לאחר עסקה/תשלום',
        documentTypes: ['חשבון עסקה', 'קבלה', 'חשבונית מס/קבלה'],
        providerMode: 'external_invoice_provider',
        israelInvoices: 'לתמוך במספר הקצאה כאשר החוק והספק דורשים זאת',
      },
    };
  }

  private socialQueue(title: string, location: string, price: string | null) {
    const base = `${title}\n${location}${price ? `\n${price}` : ''}`;
    return [
      {
        platform: 'facebook',
        format: 'post',
        cadence: 'day_0',
        copy: `${base}\nנכס חדש עלה לאוויר. לפרטים ותיאום שיחה שלחו הודעה.`,
      },
      {
        platform: 'instagram',
        format: 'reel',
        cadence: 'day_1',
        copy: `${title} ב-30 שניות: מיקום, יתרונות, ומה כדאי לדעת לפני ביקור.`,
      },
      {
        platform: 'tiktok',
        format: 'short_video',
        cadence: 'day_3',
        copy: `סיור קצר באזור ובנכס: ${title}.`,
      },
      {
        platform: 'youtube_shorts',
        format: 'short_video',
        cadence: 'day_5',
        copy: `סקירת נכס ואזור: ${title}.`,
      },
      {
        platform: 'google_business_profile',
        format: 'local_post',
        cadence: 'day_7',
        copy: `נכס חדש באזור ${location}. צרו קשר עם המשרד לפרטים.`,
      },
    ];
  }

  private videoBrief(title: string, location: string, price: string | null, property: PropertyForGrowth) {
    return {
      title: `סרטון נכס: ${title}`,
      aspectRatios: ['9:16', '1:1', '16:9'],
      voiceover: [
        `הכירו את ${title}.`,
        `הנכס נמצא ב${location}, עם גישה נוחה לשירותים באזור.`,
        property.rooms ? `הנכס כולל ${property.rooms} חדרים ומתאים למשפחה או להשקעה.` : 'פרטי החדרים יעודכנו לפי נתוני המשרד.',
        price ? `המחיר המבוקש הוא ${price}.` : 'המחיר יופיע לאחר אישור המתווך.',
        'רוצים פרטים נוספים? השאירו הודעה והמתווך יחזור אליכם.',
      ],
      scenes: [
        'פתיחה עם תמונת חזית/סלון',
        'מיקום ושכונה',
        'יתרונות מרכזיים',
        'פרטי מחיר וחדרים',
        'קריאה לפעולה',
      ],
      needsHumanApproval: true,
    };
  }

  private organicPlan(title: string) {
    return [
      { day: 0, action: 'פרסום דף נכס ופוסט ראשון', asset: title },
      { day: 2, action: 'Story/Reel קצר עם יתרון אחד', asset: 'תמונות הנכס' },
      { day: 5, action: 'פוסט אזור: בתי ספר, תחבורה, קהילה', asset: 'כתובת/שכונה' },
      { day: 9, action: 'וידאו קצר עם קריינות', asset: 'תסריט AI' },
      { day: 14, action: 'פוסט שאלות ותשובות', asset: 'תגובות ולידים שנכנסו' },
      { day: 21, action: 'רענון מודעה/מחיר/יתרון חדש', asset: 'נתוני ביצועים' },
    ];
  }

  private propertyCard(property: PropertyForGrowth) {
    return {
      id: property.id,
      title: this.propertyTitle(property),
      city: property.city,
      area: property.area,
      street: property.street,
      dealType: property.dealType,
      status: property.status,
      rooms: property.rooms,
      floor: property.floor,
      price: this.formatMoney(property.price),
      ownerName: property.ownerLead?.fullName ?? null,
      officeName: property.office?.name ?? null,
      createdAt: property.createdAt,
    };
  }

  private propertyTitle(property: PropertyForGrowth) {
    const deal = property.dealType === PropertyDealType.sale ? 'למכירה' : 'להשכרה';
    const rooms = property.rooms ? `${property.rooms} חד׳` : 'נכס';
    const location = [property.city, property.area].filter(Boolean).join(' / ');
    return `${rooms} ${deal}${location ? ` ב${location}` : ''}`;
  }

  private slugFor(property: PropertyForGrowth) {
    const parts = [property.city, property.area, property.street, property.id.slice(0, 8)]
      .filter(Boolean)
      .join('-');
    return parts
      .toLowerCase()
      .replace(/[^a-z0-9א-ת-]+/g, '-')
      .replace(/-+/g, '-');
  }

  private readiness(property: PropertyForGrowth) {
    const checks = [
      { key: 'location', label: 'כתובת/אזור', ok: Boolean(property.city || property.area || property.street) },
      { key: 'price', label: 'מחיר', ok: property.price !== null && property.price !== undefined },
      { key: 'owner', label: 'בעל נכס', ok: Boolean(property.ownerLead) },
      { key: 'description', label: 'הערות/תיאור', ok: Boolean(property.notes) },
    ];
    const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);
    return { score, checks };
  }

  private formatMoney(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    if (Number.isNaN(n) || n <= 0) return null;
    return `₪${n.toLocaleString('he-IL')}`;
  }
}

