-- CreateEnum
CREATE TYPE "PropertyDealType" AS ENUM ('sale', 'rent');

-- CreateEnum
CREATE TYPE "PropertyCondition" AS ENUM ('new', 'excellent', 'good', 'needs_renovation', 'for_demolition');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('draft', 'active', 'pending', 'sold', 'rented', 'withdrawn');

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "officeId" TEXT NOT NULL,
    "ownerLeadId" TEXT,
    "dealType" "PropertyDealType" NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "street" TEXT,
    "rooms" DOUBLE PRECISION,
    "floor" INTEGER,
    "price" INTEGER,
    "condition" "PropertyCondition",
    "status" "PropertyStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "properties_tenantId_officeId_status_idx" ON "properties"("tenantId", "officeId", "status");

-- CreateIndex
CREATE INDEX "properties_tenantId_dealType_idx" ON "properties"("tenantId", "dealType");

-- CreateIndex
CREATE INDEX "properties_tenantId_ownerLeadId_idx" ON "properties"("tenantId", "ownerLeadId");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_ownerLeadId_fkey" FOREIGN KEY ("ownerLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
