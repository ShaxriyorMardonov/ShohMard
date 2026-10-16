-- AlterTable
ALTER TABLE "University" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pinfl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_pinfl_key" ON "User"("pinfl");

