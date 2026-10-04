-- Decisão (Fase 0, AGENTS.md): User.email é único na PLATAFORMA INTEIRA, não por
-- tenant. O índice único global "users_email_key" (criado na migration inicial)
-- já cobre isso; removemos o índice composto redundante que coexistia com ele.
DROP INDEX "users_tenantId_email_key";
