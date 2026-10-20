-- AlterTable
ALTER TABLE "users" ADD COLUMN     "invitedAt" TIMESTAMP(3),
ALTER COLUMN "password" DROP NOT NULL;
