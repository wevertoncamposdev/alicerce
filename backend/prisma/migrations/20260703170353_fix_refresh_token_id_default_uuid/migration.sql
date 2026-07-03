/*
  Warnings:

  - The primary key for the `favorites` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `tenantId` to the `favorites` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `id` on the `favorites` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "favorites_userId_key";

-- AlterTable
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_pkey",
ADD COLUMN     "tenantId" UUID NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "favorites_tenantId_idx" ON "favorites"("tenantId");

-- CreateIndex
CREATE INDEX "favorites_userId_idx" ON "favorites"("userId");

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
