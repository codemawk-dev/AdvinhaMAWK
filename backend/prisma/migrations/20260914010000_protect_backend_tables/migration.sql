-- The game engine is the only public entry point. Direct Data API access must
-- never expose correct options or future rounds, even with a publishable key.
DO $protect$
DECLARE
  table_name text;
  role_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['User', 'InternalCategory', 'Artist', 'Song', 'Game', 'GameRound', 'RoundOption', 'PlayerAnswer', 'CatalogLease', '_prisma_migrations']
  LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated']
      LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
          EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', table_name, role_name);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END
$protect$;
