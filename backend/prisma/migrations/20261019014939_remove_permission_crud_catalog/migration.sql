-- Etapa 3.3 do Plano Base.md (ADR 0007): o catálogo é a única fonte de
-- permissões — não existe mais API para criar/editar/remover uma. Remove
-- "permission.create", "permission.update" e "permission.delete" de todo
-- tenant já existente (removendo primeiro as concessões de papel que as
-- referenciam, por causa da FK).
DELETE FROM "role_permissions"
WHERE "permissionId" IN (
  SELECT "id" FROM "permissions"
  WHERE "name" IN ('permission.create', 'permission.update', 'permission.delete')
);

DELETE FROM "permissions"
WHERE "name" IN ('permission.create', 'permission.update', 'permission.delete');
