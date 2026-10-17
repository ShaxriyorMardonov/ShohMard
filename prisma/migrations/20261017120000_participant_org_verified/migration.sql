-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organizationCountry" TEXT,
ADD COLUMN     "organizationVerified" BOOLEAN NOT NULL DEFAULT false;

