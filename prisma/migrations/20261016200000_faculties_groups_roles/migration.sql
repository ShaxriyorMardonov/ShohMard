-- CreateEnum
CREATE TYPE "StudyForm" AS ENUM ('KUNDUZGI', 'SIRTQI', 'KECHKI', 'MASOFAVIY');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'MANAGER';

-- DropForeignKey
ALTER TABLE "Attempt" DROP CONSTRAINT "Attempt_testId_fkey";

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "restrictedAccess" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "facultyId" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "studyForm" "StudyForm";

-- CreateTable
CREATE TABLE "Faculty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "facultyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAccess" (
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestAccess_pkey" PRIMARY KEY ("testId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_universityId_name_key" ON "Faculty"("universityId", "name");

-- CreateIndex
CREATE INDEX "Group_facultyId_idx" ON "Group"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "Group_universityId_name_key" ON "Group"("universityId", "name");

-- CreateIndex
CREATE INDEX "TestAccess_userId_idx" ON "TestAccess"("userId");

-- CreateIndex
CREATE INDEX "Test_subject_idx" ON "Test"("subject");

-- CreateIndex
CREATE INDEX "User_facultyId_idx" ON "User"("facultyId");

-- CreateIndex
CREATE INDEX "User_groupId_idx" ON "User"("groupId");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAccess" ADD CONSTRAINT "TestAccess_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAccess" ADD CONSTRAINT "TestAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Mavjud guruh nomlarini Group jadvaliga ko'chirish
INSERT INTO "Group" ("id", "name", "universityId")
SELECT 'g' || md5(u."universityId" || ':' || btrim(u."groupName")), btrim(u."groupName"), u."universityId"
FROM "User" u
WHERE u."groupName" IS NOT NULL AND btrim(u."groupName") <> '' AND u."universityId" IS NOT NULL
GROUP BY u."universityId", btrim(u."groupName");

UPDATE "User" u SET "groupId" = g."id"
FROM "Group" g
WHERE g."universityId" = u."universityId" AND g."name" = btrim(u."groupName");

ALTER TABLE "User" DROP COLUMN "groupName";
