-- AlterTable
ALTER TABLE "users" ADD COLUMN     "totpEnabledAt" TIMESTAMP(3),
ADD COLUMN     "totpRecoveryCodes" JSONB,
ADD COLUMN     "totpSecret" TEXT;
