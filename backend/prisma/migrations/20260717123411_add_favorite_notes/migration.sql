-- CreateTable
CREATE TABLE "favorite_notes" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "favoriteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_notes_favoriteId_idx" ON "favorite_notes"("favoriteId");

-- CreateIndex
CREATE INDEX "favorite_notes_tenantId_idx" ON "favorite_notes"("tenantId");

-- CreateIndex
CREATE INDEX "favorite_notes_userId_idx" ON "favorite_notes"("userId");

-- AddForeignKey
ALTER TABLE "favorite_notes" ADD CONSTRAINT "favorite_notes_favoriteId_fkey" FOREIGN KEY ("favoriteId") REFERENCES "favorites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_notes" ADD CONSTRAINT "favorite_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_notes" ADD CONSTRAINT "favorite_notes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
