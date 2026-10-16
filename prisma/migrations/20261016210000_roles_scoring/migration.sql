-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "maxScore" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "activeRole" "Role";

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "maxScore" INTEGER,
ADD COLUMN     "questionsPerAttempt" INTEGER,
ALTER COLUMN "resultRelease" SET DEFAULT 'IMMEDIATE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "roles" "Role"[] DEFAULT ARRAY['STUDENT']::"Role"[];


-- Mavjud foydalanuvchilarning rollar ro'yxati asosiy rolidan olinadi
UPDATE "User" SET "roles" = ARRAY["role"];

-- Talabalar natijani testni yakunlagach darhol ko'radi
UPDATE "Test" SET "resultRelease" = 'IMMEDIATE';
