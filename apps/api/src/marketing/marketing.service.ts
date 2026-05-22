import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  ContactRequestStatus,
  NotificationSeverity,
  NotificationType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createContactRequest(dto: CreateContactRequestDto, ip?: string) {
    const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 32) : null;

    const cr = await this.prisma.unscoped().contactRequest.create({
      data: {
        fullName: dto.fullName.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone ?? null,
        officeName: dto.officeName ?? null,
        city: dto.city ?? null,
        message: dto.message ?? null,
        source: dto.source ?? null,
        ipHash,
      },
    });

    await this.notifyPlatformAdmins(cr);
    return cr;
  }

  list(status?: ContactRequestStatus) {
    return this.prisma.unscoped().contactRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async markStatus(id: string, status: ContactRequestStatus, userId?: string) {
    return this.prisma.unscoped().contactRequest.update({
      where: { id },
      data: {
        status,
        handledAt: new Date(),
        handledByUserId: userId ?? null,
      },
    });
  }

  private async notifyPlatformAdmins(cr: { id: string; fullName: string; email: string; officeName: string | null }) {
    // Find every active platform_admin across all tenants. Most installations
    // have one platform_admin tenant; this still works if there are several.
    const admins = await this.prisma.unscoped().user.findMany({
      where: { role: UserRole.platform_admin, status: UserStatus.active },
      select: { id: true, tenantId: true },
    });
    if (admins.length === 0) {
      this.logger.warn(`Contact request ${cr.id} received but no platform_admins to notify`);
      return;
    }
    await this.prisma.unscoped().notification.createMany({
      data: admins.map((a) => ({
        tenantId: a.tenantId,
        userId: a.id,
        type: NotificationType.contact_request,
        severity: NotificationSeverity.alert,
        title: `📞 פנייה חדשה מהאתר: ${cr.fullName}`,
        body: `${cr.officeName ?? '—'} · ${cr.email}`,
        link: `/admin/contact-requests/${cr.id}`,
        metadata: { contactRequestId: cr.id },
      })),
    });
  }
}
