-- AlterTable
ALTER TABLE "offices" ADD COLUMN     "inactivatedAt" TIMESTAMP(3),
ADD COLUMN     "inactivatedByUserId" TEXT,
ADD COLUMN     "inactivatedReason" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "planCatalogId" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedByUserId" TEXT,
ADD COLUMN     "suspendedReason" TEXT;

-- CreateTable
CREATE TABLE "area_catalog" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,
    "region" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "office_areas" (
    "officeId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "office_areas_pkey" PRIMARY KEY ("officeId","areaId")
);

-- CreateTable
CREATE TABLE "plan_catalog" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,
    "tagline" TEXT,
    "setupFeeIls" INTEGER NOT NULL DEFAULT 0,
    "monthlyPlanIls" INTEGER NOT NULL DEFAULT 0,
    "includedMessages" INTEGER NOT NULL DEFAULT 0,
    "includedCallMinutes" INTEGER NOT NULL DEFAULT 0,
    "monthlyLlmBudgetUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "extraMessageIls" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "extraCallMinuteIls" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "successFeePct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "area_catalog_slug_key" ON "area_catalog"("slug");

-- CreateIndex
CREATE INDEX "area_catalog_active_sortOrder_idx" ON "area_catalog"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "office_areas_areaId_idx" ON "office_areas"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "plan_catalog_slug_key" ON "plan_catalog"("slug");

-- CreateIndex
CREATE INDEX "plan_catalog_active_sortOrder_idx" ON "plan_catalog"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "tenants_planCatalogId_idx" ON "tenants"("planCatalogId");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_planCatalogId_fkey" FOREIGN KEY ("planCatalogId") REFERENCES "plan_catalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_areas" ADD CONSTRAINT "office_areas_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "offices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "office_areas" ADD CONSTRAINT "office_areas_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "area_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
