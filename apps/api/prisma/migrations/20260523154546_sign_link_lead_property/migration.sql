-- AlterTable
ALTER TABLE "sign_documents" ADD COLUMN     "lead_id" TEXT,
ADD COLUMN     "property_id" TEXT;

-- CreateIndex
CREATE INDEX "sign_documents_lead_id_idx" ON "sign_documents"("lead_id");

-- CreateIndex
CREATE INDEX "sign_documents_property_id_idx" ON "sign_documents"("property_id");

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sign_documents" ADD CONSTRAINT "sign_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
