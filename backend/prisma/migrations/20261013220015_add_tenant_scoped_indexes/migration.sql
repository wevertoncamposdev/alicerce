-- CreateIndex
CREATE INDEX "audits_tenantId_createdAt_idx" ON "audits"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "audits_tenantId_entity_entityId_idx" ON "audits"("tenantId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "role_permissions_tenantId_idx" ON "role_permissions"("tenantId");

-- CreateIndex
CREATE INDEX "roles_tenantId_idx" ON "roles"("tenantId");

-- CreateIndex
CREATE INDEX "user_roles_tenantId_idx" ON "user_roles"("tenantId");
