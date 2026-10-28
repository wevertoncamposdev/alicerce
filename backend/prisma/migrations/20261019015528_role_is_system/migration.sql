-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Etapa 3.4 do Plano Base.md (ADR 0007): marca o ADMIN inicial de cada
-- tenant já existente como papel de sistema (não pode ser excluído nem
-- renomeado daqui pra frente).
UPDATE "roles" SET "isSystem" = true WHERE "type" = 'ADMIN';
