-- CreateEnum
CREATE TYPE "UsageEventType" AS ENUM ('llm_tokens', 'whatsapp_message', 'call_minute', 'voice_session', 'storage');

-- CreateTable
CREATE TABLE "usage_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "officeId" TEXT,
    "agentId" TEXT,
    "conversationId" TEXT,
    "type" "UsageEventType" NOT NULL,
    "provider" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "costEstimate" DECIMAL(12,6),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_events_tenantId_createdAt_idx" ON "usage_events"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "usage_events_tenantId_type_createdAt_idx" ON "usage_events"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "usage_events_tenantId_provider_createdAt_idx" ON "usage_events"("tenantId", "provider", "createdAt");

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
