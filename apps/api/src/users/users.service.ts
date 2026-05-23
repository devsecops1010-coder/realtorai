import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { AuthLifecycleService } from '../auth/auth-lifecycle.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycle: AuthLifecycleService,
  ) {}

  list() {
    return this.prisma.scoped.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        officeId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async getById(id: string) {
    const user = await this.prisma.scoped.user.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        officeId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async invite(dto: InviteUserDto) {
    if (dto.role === UserRole.platform_admin) {
      throw new ForbiddenException('Cannot invite platform_admin from tenant scope');
    }

    const callerRole = RequestContext.getRole();
    if (callerRole === UserRole.office_manager && dto.role === UserRole.office_owner) {
      throw new ForbiddenException('office_manager cannot invite office_owner');
    }

    const officeId = dto.officeId ?? RequestContext.get().officeId ?? null;
    if (!officeId) {
      throw new BadRequestException('officeId is required when caller has no current office');
    }

    try {
      const data: Omit<Prisma.UserUncheckedCreateInput, 'tenantId'> = {
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone ?? null,
        role: dto.role,
        status: UserStatus.invited,
        officeId,
      };
      const created = await this.prisma.scoped.user.create({
        data: data as Prisma.UserUncheckedCreateInput,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          officeId: true,
          createdAt: true,
          office: { select: { name: true } },
        },
      });

      // Issue activation token + send invitation email. Best-effort — if
      // email delivery fails the user record is still created and admins
      // can resend the invite later (TODO: add resend endpoint).
      try {
        const inviterId = RequestContext.get().userId;
        const inviter = inviterId
          ? await this.prisma.unscoped().user.findUnique({
              where: { id: inviterId },
              select: { name: true },
            })
          : null;
        await this.lifecycle.issueActivationForInvite({
          userId: created.id,
          recipientEmail: created.email,
          recipientName: created.name,
          inviterName: inviter?.name ?? 'מנהל המשרד',
          officeName: created.office?.name ?? 'המשרד שלך',
        });
      } catch (err) {
        this.logger.error(
          `Activation email pipeline failed for ${created.email}: ${(err as Error).message}`,
        );
      }

      // Strip the `office` relation from the response — callers expected the
      // pre-existing shape.
      const { office: _office, ...rest } = created;
      return rest;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Email already in use for this tenant');
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.role === UserRole.platform_admin) {
      throw new ForbiddenException('Cannot assign platform_admin from tenant scope');
    }

    const existing = await this.prisma.scoped.user.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const callerRole = RequestContext.getRole();
    if (
      callerRole === UserRole.office_manager &&
      (existing.role === UserRole.office_owner || dto.role === UserRole.office_owner)
    ) {
      throw new ForbiddenException('office_manager cannot modify office_owner');
    }

    return this.prisma.scoped.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.officeId !== undefined && { officeId: dto.officeId }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        officeId: true,
        updatedAt: true,
      },
    });
  }
}
