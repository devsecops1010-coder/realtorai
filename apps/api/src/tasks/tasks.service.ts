import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskCreatedByType, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTasksQuery) {
    const where: Prisma.TaskWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.leadId) where.leadId = query.leadId;
    if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
    if (query.mine) where.assignedUserId = RequestContext.getUserId() ?? '__none__';

    const [items, total] = await Promise.all([
      this.prisma.scoped.task.findMany({
        where,
        orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
        take: query.take,
        skip: query.skip,
        include: {
          lead: { select: { id: true, fullName: true, phone: true } },
          assignedUser: { select: { id: true, name: true } },
        },
      }),
      this.prisma.scoped.task.count({ where }),
    ]);

    return { items, total, take: query.take, skip: query.skip };
  }

  async getById(id: string) {
    const task = await this.prisma.scoped.task.findFirst({
      where: { id },
      include: {
        lead: { select: { id: true, fullName: true, phone: true } },
        assignedUser: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(dto: CreateTaskDto) {
    const officeId = await this.resolveOfficeId(dto.officeId);
    if (dto.leadId) {
      const lead = await this.prisma.scoped.lead.findFirst({ where: { id: dto.leadId } });
      if (!lead) throw new NotFoundException('Lead not found');
    }
    if (dto.assignedUserId) {
      const user = await this.prisma.scoped.user.findFirst({ where: { id: dto.assignedUserId } });
      if (!user) throw new NotFoundException('Assignee not found');
    }

    const data: Omit<Prisma.TaskUncheckedCreateInput, 'tenantId'> = {
      officeId,
      leadId: dto.leadId ?? null,
      assignedUserId: dto.assignedUserId ?? null,
      title: dto.title.trim(),
      description: dto.description ?? null,
      type: dto.type ?? 'custom',
      status: TaskStatus.open,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      createdByType: TaskCreatedByType.user,
      createdById: RequestContext.getUserId() ?? null,
    };

    return this.prisma.scoped.task.create({
      data: data as Prisma.TaskUncheckedCreateInput,
    });
  }

  async update(id: string, dto: UpdateTaskDto) {
    const existing = await this.prisma.scoped.task.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    if (dto.assignedUserId && dto.assignedUserId !== existing.assignedUserId) {
      const user = await this.prisma.scoped.user.findFirst({ where: { id: dto.assignedUserId } });
      if (!user) throw new NotFoundException('Assignee not found');
    }

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.assignedUserId !== undefined) data.assignedUserId = dto.assignedUserId;
    if (dto.dueAt !== undefined) data.dueAt = new Date(dto.dueAt);
    if (dto.status !== undefined) {
      if (
        dto.status === TaskStatus.done &&
        existing.status !== TaskStatus.done
      ) {
        data.completedAt = new Date();
      }
      data.status = dto.status;
    }

    return this.prisma.scoped.task.update({ where: { id }, data });
  }

  private async resolveOfficeId(provided?: string): Promise<string> {
    if (provided) {
      const office = await this.prisma.scoped.office.findFirst({ where: { id: provided } });
      if (!office) throw new NotFoundException(`Office ${provided} not found in this tenant`);
      return provided;
    }
    const callerOfficeId = RequestContext.get().officeId;
    if (!callerOfficeId) {
      throw new BadRequestException('officeId required when caller has no current office');
    }
    return callerOfficeId;
  }
}
