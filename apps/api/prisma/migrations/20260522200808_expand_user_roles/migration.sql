-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'team_lead';
ALTER TYPE "UserRole" ADD VALUE 'mortgage_advisor';
ALTER TYPE "UserRole" ADD VALUE 'marketing_manager';
ALTER TYPE "UserRole" ADD VALUE 'secretary';
ALTER TYPE "UserRole" ADD VALUE 'accountant';
