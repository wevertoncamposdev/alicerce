-- RLS pra "feedbacks"/"feedback_comments" — mesmo padrão de
-- add_tenant_rls/add_rls_to_examples.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['feedbacks', 'feedback_comments']
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
