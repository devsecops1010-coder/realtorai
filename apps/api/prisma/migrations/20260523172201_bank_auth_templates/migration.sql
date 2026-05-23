-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "streetAddress" TEXT;

-- AlterTable
ALTER TABLE "mortgage_advisors" ADD COLUMN     "consultingCompany" TEXT,
ADD COLUMN     "consultingCompanyId" TEXT,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "nationalId" TEXT;

-- AlterTable
ALTER TABLE "mortgage_profiles" ADD COLUMN     "coApplicantName" TEXT,
ADD COLUMN     "coApplicantNationalId" TEXT,
ADD COLUMN     "coApplicantPhone" TEXT;

-- CreateTable
CREATE TABLE "bank_auth_templates" (
    "id" TEXT NOT NULL,
    "bankSlug" TEXT NOT NULL,
    "bankNameHe" TEXT NOT NULL,
    "bankNameEn" TEXT,
    "pdfPath" TEXT NOT NULL,
    "overlay" JSONB NOT NULL DEFAULT '[]',
    "acroFormMap" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_auth_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_auth_templates_bankSlug_key" ON "bank_auth_templates"("bankSlug");
