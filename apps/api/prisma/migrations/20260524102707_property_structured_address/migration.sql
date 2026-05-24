-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "houseNumber" INTEGER,
ADD COLUMN     "settlementId" TEXT,
ADD COLUMN     "streetId" TEXT;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "il_settlements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "il_streets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
