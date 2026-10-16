-- Role de runtime da aplicação (ver APP_DATABASE_URL): SEM privilégio de
-- owner das tabelas, por isso é a única forma de uma política de RLS (ver a
-- próxima migration, add_tenant_rls) valer de verdade — a role atual (owner
-- de todas as tabelas, usada por migrations/seed) ignora RLS por padrão no
-- Postgres, com ou sem política criada.
--
-- Em produção, crie esta role fora de uma migration versionada (a senha não
-- deveria viver em git) e configure APP_DATABASE_URL via secrets do seu
-- provedor — o padrão abaixo serve só para dev local/docker-compose, como já
-- é o caso de JWT_SECRET/COOKIE_SECRET neste template.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Tabelas criadas por migrations futuras também devem ficar acessíveis a
-- esta role sem precisar lembrar de um GRANT manual a cada vez.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;
