-- Etapa 1.5 do Plano Base.md: a sanitização recursiva do AuditInterceptor só
-- vale a partir de agora — registros já gravados antes dela (login, signup,
-- refresh) podiam guardar o access_token em claro no campo "after". Remove
-- a chave "access_token" de qualquer registro de auditoria onde ela exista,
-- em qualquer "type", sem tocar no resto do payload.
UPDATE "audits"
SET "after" = (("after")::jsonb - 'access_token')::text
WHERE "after" IS NOT NULL
  AND jsonb_typeof(("after")::jsonb) = 'object'
  AND ("after")::jsonb ? 'access_token';
