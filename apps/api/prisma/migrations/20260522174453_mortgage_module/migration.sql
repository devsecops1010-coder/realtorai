-- CreateEnum
CREATE TYPE "MortgageStatus" AS ENUM ('unknown', 'not_relevant', 'needs_advisor', 'referred', 'contacted_by_advisor', 'pre_approved', 'declined');

-- CreateEnum
CREATE TYPE "MortgageReadiness" AS ENUM ('unknown', 'not_ready', 'partial', 'ready', 'approved');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'contacted', 'qualified', 'in_process', 'closed_won', 'closed_lost', 'declined');

-- AlterEnum
ALTER TYPE "AgentType" ADD VALUE 'mortgage_intake';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'mortgage_referred';
ALTER TYPE "NotificationType" ADD VALUE 'mortgage_pre_approved';
ALTER TYPE "NotificationType" ADD VALUE 'mortgage_not_relevant';
ALTER TYPE "NotificationType" ADD VALUE 'mortgage_advisor_idle';

-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'mortgage_followup';

-- CreateTable
CREATE TABLE "mortgage_advisors" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "company" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortgage_advisors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortgage_profiles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "estimatedPrice" INTEGER,
    "estimatedEquity" INTEGER,
    "hasPreApproval" BOOLEAN NOT NULL DEFAULT false,
    "preApprovalAmount" INTEGER,
    "preApprovalBank" TEXT,
    "monthlyIncome" INTEGER,
    "status" "MortgageStatus" NOT NULL DEFAULT 'unknown',
    "readinessScore" INTEGER,
    "readiness" "MortgageReadiness" NOT NULL DEFAULT 'unknown',
    "consentToShareWithAdvisor" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "consentText" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortgage_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mortgage_referrals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "mortgageProfileId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "referredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mortgage_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mortgage_advisors_tenantId_status_idx" ON "mortgage_advisors"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "mortgage_profiles_leadId_key" ON "mortgage_profiles"("leadId");

-- CreateIndex
CREATE INDEX "mortgage_profiles_tenantId_status_idx" ON "mortgage_profiles"("tenantId", "status");

-- CreateIndex
CREATE INDEX "mortgage_profiles_tenantId_readiness_idx" ON "mortgage_profiles"("tenantId", "readiness");

-- CreateIndex
CREATE INDEX "mortgage_referrals_tenantId_status_idx" ON "mortgage_referrals"("tenantId", "status");

-- CreateIndex
CREATE INDEX "mortgage_referrals_advisorId_status_idx" ON "mortgage_referrals"("advisorId", "status");

-- CreateIndex
CREATE INDEX "mortgage_referrals_mortgageProfileId_idx" ON "mortgage_referrals"("mortgageProfileId");

-- AddForeignKey
ALTER TABLE "mortgage_advisors" ADD CONSTRAINT "mortgage_advisors_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgage_profiles" ADD CONSTRAINT "mortgage_profiles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgage_profiles" ADD CONSTRAINT "mortgage_profiles_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgage_referrals" ADD CONSTRAINT "mortgage_referrals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgage_referrals" ADD CONSTRAINT "mortgage_referrals_mortgageProfileId_fkey" FOREIGN KEY ("mortgageProfileId") REFERENCES "mortgage_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mortgage_referrals" ADD CONSTRAINT "mortgage_referrals_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "mortgage_advisors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
