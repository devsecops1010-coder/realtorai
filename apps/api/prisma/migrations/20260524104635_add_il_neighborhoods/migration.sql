-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "neighborhoodId" TEXT;

-- CreateTable
CREATE TABLE "il_neighborhoods" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "il_neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "il_neighborhoods_settlementId_nameHe_idx" ON "il_neighborhoods"("settlementId", "nameHe");

-- CreateIndex
CREATE INDEX "il_neighborhoods_nameHe_idx" ON "il_neighborhoods"("nameHe");

-- CreateIndex
CREATE UNIQUE INDEX "il_neighborhoods_settlementId_slug_key" ON "il_neighborhoods"("settlementId", "slug");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_neighborhoodId_fkey" FOREIGN KEY ("neighborhoodId") REFERENCES "il_neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "il_neighborhoods" ADD CONSTRAINT "il_neighborhoods_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "il_settlements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
