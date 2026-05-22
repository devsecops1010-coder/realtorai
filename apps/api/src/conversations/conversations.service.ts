import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConversationStatus,
  MessageSenderType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RequestContext } from '../common/context/request-context';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { ListConversationsQuery } from './dto/list-conversations.query';
import { HandoffDto } from './dto/handoff.dto';
import { SummaryDto } from './dto/summary.dto';
import { PostMessageDto } from './dto/post-message.dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListConversationsQuery) {
    const where: Prisma.ConversationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    if (query.leadId) where.leadId = query.leadId;
    if (query.agentId) where.agentId = query.agentId;
    if (query.handoffRequired !== undefined) where.handoffRequired = query.handoffRequired;

    const [items, total] = await Promise.all([
      this.prisma.scoped.conversation.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: query.take,
        skip: query.skip,
        include: {
          lead: { select: { id: true, fullName: true, phone: true, status: true } },
          agent: { select: { id: true, type: true, name: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.scoped.conversation.count({ where }),
    ]);

    return { items, total, take: query.take, skip: query.skip };
  }

  async getById(id: string) {
    const conversation = await this.prisma.scoped.conversation.findFirst({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            status: true,
            temperature: true,
          },
        },
        agent: { select: { id: true, type: true, name: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 500,
        },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async create(dto: CreateConversationDto) {
    const officeId = await this.resolveOfficeId(dto.officeId);
    if (dto.leadId) {
      const lead = await this.prisma.scoped.lead.findFirst({ where: { id: dto.leadId } });
      if (!lead) throw new NotFoundException('Lead not found');
    }
    if (dto.agentId) {
      const agent = await this.prisma.scoped.agent.findFirst({ where: { id: dto.agentId } });
      if (!agent) throw new NotFoundException('Agent not found');
    }

    const data: Omit<Prisma.ConversationUncheckedCreateInput, 'tenantId'> = {
      officeId,
      leadId: dto.leadId ?? null,
      channel: dto.channel,
      agentId: dto.agentId ?? null,
      status: ConversationStatus.active,
    };

    return this.prisma.scoped.conversation.create({
      data: data as Prisma.ConversationUncheckedCreateInput,
    });
  }

  async handoff(id: string, dto: HandoffDto) {
    const conversation = await this.prisma.scoped.conversation.findFirst({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.scoped.conversation.update({
      where: { id },
      data: {
        handoffRequired: true,
        status: ConversationStatus.handoff,
        metadata: dto.reason
          ? { ...((conversation.metadata as object) ?? {}), handoffReason: dto.reason }
          : conversation.metadata ?? undefined,
      },
    });
  }

  async setSummary(id: string, dto: SummaryDto) {
    const conversation = await this.prisma.scoped.conversation.findFirst({ where: { id } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.scoped.conversation.update({
      where: { id },
      data: { summary: dto.summary },
    });
  }

  async postMessage(conversationId: string, dto: PostMessageDto) {
    const conversation = await this.prisma.scoped.conversation.findFirst({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.status === ConversationStatus.closed) {
      throw new BadRequestException('Cannot post to a closed conversation');
    }

    const senderType = dto.senderType ?? MessageSenderType.user;
    const senderId = senderType === MessageSenderType.user ? RequestContext.getUserId() ?? null : null;

    const data: Omit<Prisma.MessageUncheckedCreateInput, 'tenantId'> = {
      conversationId,
      senderType,
      senderId,
      body: dto.body,
    };

    return this.prisma.scoped.message.create({
      data: data as Prisma.MessageUncheckedCreateInput,
    });
  }

  async listMessages(conversationId: string) {
    const conversation = await this.prisma.scoped.conversation.findFirst({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.scoped.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
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
