-- P3 full tenant RLS coverage.
-- This expands app-role RLS policies to every migrated tenant-scoped table
-- that has an org_id column plus the tenant root organizations table and
-- parent-scoped audit tables that do not carry org_id directly.
--
-- FORCE ROW LEVEL SECURITY is intentionally not enabled here. Current local
-- owner/dev flows still use the owner connection while P3 runtime enforcement
-- is expanded. The non-owner app role `ttndd_app` is isolated by these policies.

DO $$
DECLARE
    tenant_table text;
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ttndd_app') THEN
        CREATE ROLE ttndd_app LOGIN PASSWORD 'ttndd_local' NOSUPERUSER INHERIT;
    END IF;

    GRANT USAGE ON SCHEMA public TO ttndd_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ttndd_app;

    FOR tenant_table IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND a.attname = 'org_id'
          AND NOT a.attisdropped
        ORDER BY c.relname
    LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO ttndd_app', tenant_table);
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_isolation_' || tenant_table, tenant_table);
        EXECUTE format(
            'CREATE POLICY %I ON %I
             USING (org_id = NULLIF(current_setting(''app.current_org_id'', true), '''')::uuid)
             WITH CHECK (org_id = NULLIF(current_setting(''app.current_org_id'', true), '''')::uuid)',
            'org_isolation_' || tenant_table,
            tenant_table
        );
    END LOOP;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE organizations TO ttndd_app;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_organizations ON organizations;
CREATE POLICY org_isolation_organizations ON organizations
    USING (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ticket_status_history TO ttndd_app;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_ticket_status_history ON ticket_status_history;
CREATE POLICY org_isolation_ticket_status_history ON ticket_status_history
    USING (
        EXISTS (
            SELECT 1
            FROM tickets
            WHERE tickets.id = ticket_status_history.ticket_id
              AND tickets.org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM tickets
            WHERE tickets.id = ticket_status_history.ticket_id
              AND tickets.org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE notification_delivery_logs TO ttndd_app;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_notification_delivery_logs ON notification_delivery_logs;
CREATE POLICY org_isolation_notification_delivery_logs ON notification_delivery_logs
    USING (
        EXISTS (
            SELECT 1
            FROM notifications
            WHERE notifications.id = notification_delivery_logs.notification_id
              AND notifications.org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM notifications
            WHERE notifications.id = notification_delivery_logs.notification_id
              AND notifications.org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid
        )
    );
