-- `examples`/`example_notes` substituem `favorites`/`favorite_notes`
-- (ver PLAN.md, Etapa 7.D) — a RLS que existia nas tabelas antigas foi
-- perdida no DROP TABLE da migration anterior; recriando aqui nas novas,
-- mesmo padrão de `add_tenant_rls`.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['examples', 'example_notes']
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
