-- CreateEnum
CREATE TYPE "TestKind" AS ENUM ('REGULAR', 'OLYMPIAD_INTL', 'OLYMPIAD_LOCAL');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PARTICIPANT';

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "kind" "TestKind" NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organization" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE INDEX "Test_kind_idx" ON "Test"("kind");

