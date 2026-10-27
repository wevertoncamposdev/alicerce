-- I3 (docs/PLAN-fase-12.md), etapa F2.2: sem normalização de caixa,
-- "Fulano@x.com" e "fulano@x.com" eram contas diferentes pro Postgres.
-- Passo 1: aborta a migration inteira se já existir duplicata por
-- lower(trim(email)) em "users" ou "platform_users" — nesse caso a
-- normalização automática (passo 2) criaria uma colisão de UNIQUE, e
-- precisa de intervenção manual (qual das contas duplicadas é a "certa")
-- antes de seguir.
DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(grp.email_norm || ' (' || grp.cnt || ')', ', ')
  INTO dupes
  FROM (
    SELECT lower(trim(email)) AS email_norm, count(*) AS cnt
    FROM "users"
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
  ) grp;

  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION 'normalize_emails: "users" tem e-mails duplicados por lower(trim(email)): %. Resolva manualmente antes de rodar esta migration.', dupes;
  END IF;
END $$;

DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(grp.email_norm || ' (' || grp.cnt || ')', ', ')
  INTO dupes
  FROM (
    SELECT lower(trim(email)) AS email_norm, count(*) AS cnt
    FROM "platform_users"
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
  ) grp;

  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION 'normalize_emails: "platform_users" tem e-mails duplicados por lower(trim(email)): %. Resolva manualmente antes de rodar esta migration.', dupes;
  END IF;
END $$;

-- Passo 2: normaliza os valores existentes.
UPDATE "users"
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

UPDATE "platform_users"
SET email = lower(trim(email))
WHERE email <> lower(trim(email));

-- Passo 3: nenhuma escrita futura escapa da regra, mesmo fora da
-- aplicação (script, seed, acesso direto ao banco) — o DTO
-- (@NormalizeEmail(), core/common/validators/normalize-email.decorator.ts)
-- já normaliza antes de chegar aqui, isto é a rede de segurança no banco.
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase" CHECK (email = lower(email));

ALTER TABLE "platform_users"
  ADD CONSTRAINT "platform_users_email_lowercase" CHECK (email = lower(email));
