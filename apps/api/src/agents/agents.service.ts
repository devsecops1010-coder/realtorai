import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.scoped.agent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        configs: {
          where: { isActive: true },
          take: 1,
          orderBy: { version: 'desc' },
          select: { id: true, version: true, prompt: true, isActive: true },
        },
      },
    });
  }

  async getById(id: string) {
    const agent = await this.prisma.scoped.agent.findFirst({
      where: { id },
      include: { configs: { orderBy: { version: 'desc' } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async updateConfig(
    agentId: string,
    dto: { prompt?: string; rules?: Record<string, unknown>; tools?: unknown[]; handoffRules?: Record<string, unknown>; isActive?: boolean },
  ) {
    const agent = await this.prisma.scoped.agent.findFirst({ where: { id: agentId } });
    if (!agent) throw new NotFoundException('Agent not found');

    const latest = await this.prisma.scoped.agentConfig.findFirst({
      where: { agentId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    if (dto.isActive) {
      await this.prisma.scoped.agentConfig.updateMany({
        where: { agentId, isActive: true },
        data: { isActive: false },
      });
    }

    const data: Omit<Prisma.AgentConfigUncheckedCreateInput, 'tenantId'> = {
      agentId,
      prompt: dto.prompt ?? latest?.prompt ?? '',
      rules: (dto.rules ?? latest?.rules ?? {}) as Prisma.InputJsonValue,
      tools: (dto.tools ?? latest?.tools ?? []) as Prisma.InputJsonValue,
      handoffRules: (dto.handoffRules ?? latest?.handoffRules ?? {}) as Prisma.InputJsonValue,
      version: nextVersion,
      isActive: dto.isActive ?? true,
    };

    return this.prisma.scoped.agentConfig.create({
      data: data as Prisma.AgentConfigUncheckedCreateInput,
    });
  }
}
