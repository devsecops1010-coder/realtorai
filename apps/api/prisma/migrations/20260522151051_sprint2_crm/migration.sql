-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'hot', 'meeting_scheduled', 'not_relevant', 'no_answer', 'opted_out', 'handoff_to_human');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('cold', 'warm', 'hot');

-- CreateEnum
CREATE TYPE "LeadIntent" AS ENUM ('buy', 'sell', 'rent', 'list_for_rent', 'unknown');

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('whatsapp', 'voice', 'web', 'form', 'manual');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('active', 'waiting', 'closed', 'handoff');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('lead', 'user', 'ai_agent', 'system');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('open', 'in_progress', 'done', 'cancelled', 'snoozed');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('followup', 'call_lead', 'visit', 'send_property', 'custom');

-- CreateEnum
CREATE TYPE "TaskCreatedByType" AS ENUM ('user', 'ai_agent', 'system');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('lead_responder', 'property_recruiter', 'crm_followup', 'qa_agent', 'support_agent');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('active', 'paused', 'disabled');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "assignedUserId" TEXT,
    "source" TEXT,
    "fullName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "intent" "LeadIntent" NOT NULL DEFAULT 'unknown',
    "city" TEXT,
    "area" TEXT,
    "budgetMin" INTEGER,
    "budgetMax" INTEGER,
    "rooms" DOUBLE PRECISION,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "temperature" "LeadTemperature" NOT NULL DEFAULT 'cold',
    "nextFollowupAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "officeId" TEXT,
    "type" "AgentType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'paused',
    "modelPolicy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_configs" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "tools" JSONB NOT NULL DEFAULT '[]',
    "handoffRules" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "leadId" TEXT,
    "channel" "ConversationChannel" NOT NULL,
    "agentId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "summary" TEXT,
    "handoffRequired" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderType" "MessageSenderType" NOT NULL,
    "senderId" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "leadId" TEXT,
    "assignedUserId" TEXT,
    "type" "TaskType" NOT NULL DEFAULT 'custom',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMP(3),
    "createdByType" "TaskCreatedByType" NOT NULL DEFAULT 'user',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_tenantId_officeId_idx" ON "leads"("tenantId", "officeId");

-- CreateIndex
CREATE INDEX "leads_tenantId_status_idx" ON "leads"("tenantId", "status");

-- CreateIndex
CREATE INDEX "leads_tenantId_temperature_idx" ON "leads"("tenantId", "temperature");

-- CreateIndex
CREATE INDEX "leads_tenantId_assignedUserId_idx" ON "leads"("tenantId", "assignedUserId");

-- CreateIndex
CREATE INDEX "leads_tenantId_phone_idx" ON "leads"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "agents_tenantId_type_idx" ON "agents"("tenantId", "type");

-- CreateIndex
CREATE INDEX "agent_configs_agentId_isActive_idx" ON "agent_configs"("agentId", "isActive");

-- CreateIndex
CREATE INDEX "agent_configs_tenantId_agentId_idx" ON "agent_configs"("tenantId", "agentId");

-- CreateIndex
CREATE INDEX "conversations_tenantId_officeId_status_idx" ON "conversations"("tenantId", "officeId", "status");

-- CreateIndex
CREATE INDEX "conversations_tenantId_leadId_idx" ON "conversations"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "conversations_tenantId_agentId_idx" ON "conversations"("tenantId", "agentId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "messages_tenantId_createdAt_idx" ON "messages"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "tasks_tenantId_officeId_status_idx" ON "tasks"("tenantId", "officeId", "status");

-- CreateIndex
CREATE INDEX "tasks_tenantId_assignedUserId_status_idx" ON "tasks"("tenantId", "assignedUserId", "status");

-- CreateIndex
CREATE INDEX "tasks_tenantId_leadId_idx" ON "tasks"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "tasks_tenantId_dueAt_idx" ON "tasks"("tenantId", "dueAt");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
