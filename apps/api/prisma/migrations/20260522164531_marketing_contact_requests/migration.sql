-- CreateEnum
CREATE TYPE "ContactRequestStatus" AS ENUM ('new', 'contacted', 'qualified', 'converted', 'closed');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'contact_request';

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "officeName" TEXT,
    "phone" TEXT,
    "email" TEXT NOT NULL,
    "city" TEXT,
    "message" TEXT,
    "source" TEXT,
    "ipHash" TEXT,
    "status" "ContactRequestStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "handledAt" TIMESTAMP(3),
    "handledByUserId" TEXT,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_requests_status_createdAt_idx" ON "contact_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "contact_requests_email_idx" ON "contact_requests"("email");
