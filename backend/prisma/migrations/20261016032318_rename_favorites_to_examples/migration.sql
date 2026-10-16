/*
  Warnings:

  - You are about to drop the `favorite_notes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `favorites` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "favorite_notes" DROP CONSTRAINT "favorite_notes_favoriteId_fkey";

-- DropForeignKey
ALTER TABLE "favorite_notes" DROP CONSTRAINT "favorite_notes_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "favorite_notes" DROP CONSTRAINT "favorite_notes_userId_fkey";

-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "favorites" DROP CONSTRAINT "favorites_userId_fkey";

-- DropTable
DROP TABLE "favorite_notes";

-- DropTable
DROP TABLE "favorites";

-- CreateTable
CREATE TABLE "examples" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID NOT NULL,

    CONSTRAINT "examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "example_notes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "exampleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "example_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "examples_tenantId_idx" ON "examples"("tenantId");

-- CreateIndex
CREATE INDEX "examples_userId_idx" ON "examples"("userId");

-- CreateIndex
CREATE INDEX "example_notes_exampleId_idx" ON "example_notes"("exampleId");

-- CreateIndex
CREATE INDEX "example_notes_tenantId_idx" ON "example_notes"("tenantId");

-- CreateIndex
CREATE INDEX "example_notes_userId_idx" ON "example_notes"("userId");

-- AddForeignKey
ALTER TABLE "examples" ADD CONSTRAINT "examples_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "examples" ADD CONSTRAINT "examples_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "example_notes" ADD CONSTRAINT "example_notes_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "examples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "example_notes" ADD CONSTRAINT "example_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "example_notes" ADD CONSTRAINT "example_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
