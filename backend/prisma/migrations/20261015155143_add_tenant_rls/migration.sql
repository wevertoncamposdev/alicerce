-- RLS como defesa-em-profundidade: se algum guard/service futuro esquecer um
-- `where: { tenantId }`, o Postgres ainda bloqueia a linha de outro tenant —
-- em vez de depender 100% do código da aplicação lembrar de filtrar.
--
-- `app.tenant_id` é setado por requisição via `set_config()` dentro de uma
-- transação (ver tenant-rls.extension.ts) — a role owner (DATABASE_URL)
-- ignora estas políticas (não está marcada FORCE), por isso migrations/seed
-- continuam funcionando sem precisar setar nada.
--
-- Fora da lista abaixo (ex.: Tenant, PersonAddress, Address, Contact,
-- PersonDocument): não têm coluna tenantId própria — Tenant é a raiz da
-- isolação, e os demais só existem através de Person (que já está na lista).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
    'audits', 'tasks', 'favorites', 'favorite_notes', 'reports',
    'refresh_tokens', 'tenant_areas', 'tenant_board_members',
    'tenant_board_terms', 'tenant_documents', 'people'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      $f$CREATE POLICY tenant_isolation ON %I
         USING ("tenantId" = current_setting('app.tenant_id', true)::uuid)
         WITH CHECK ("tenantId" = current_setting('app.tenant_id', true)::uuid)$f$,
      t
    );
  END LOOP;
END
$$;
