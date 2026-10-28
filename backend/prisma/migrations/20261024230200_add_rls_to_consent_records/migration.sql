-- RLS pra "consent_records" — mesmo padrão de add_rls_to_account_tokens.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['consent_records']
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
