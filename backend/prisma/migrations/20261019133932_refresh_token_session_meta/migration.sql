-- AlterTable
ALTER TABLE "refresh_tokens" ADD COLUMN     "ip" VARCHAR(45),
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" VARCHAR(255);
