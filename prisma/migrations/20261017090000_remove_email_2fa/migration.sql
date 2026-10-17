-- DropForeignKey
ALTER TABLE "EmailCode" DROP CONSTRAINT "EmailCode_userId_fkey";

-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
DROP COLUMN "emailVerifiedAt";

-- DropTable
DROP TABLE "EmailCode";

