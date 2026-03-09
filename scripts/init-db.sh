#!/bin/bash
# Init DB script — runs on first container creation
# Creates the ttndd_app runtime user for RLS enforcement

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ttndd_app') THEN
      CREATE ROLE ttndd_app WITH LOGIN PASSWORD 'ttndd_app_local';
      GRANT CONNECT ON DATABASE ttndd_ops TO ttndd_app;
      GRANT USAGE ON SCHEMA public TO ttndd_app;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ttndd_app;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ttndd_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ttndd_app;
      RAISE NOTICE 'Created ttndd_app role for RLS runtime.';
    ELSE
      RAISE NOTICE 'ttndd_app role already exists.';
    END IF;
  END
  \$\$;
EOSQL
