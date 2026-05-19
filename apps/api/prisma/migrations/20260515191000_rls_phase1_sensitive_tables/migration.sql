-- RLS Phase 1: HRM, guardian, tickets, notifications, audit.
-- Runtime tenant isolation is enforced for the non-owner app role `ttndd_app`.
-- P3 will expand coverage and enable FORCE after all tenant-scoped services run
-- inside explicit RLS transactions.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ttndd_app') THEN
        CREATE ROLE ttndd_app LOGIN PASSWORD 'ttndd_local' NOSUPERUSER INHERIT;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO ttndd_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    org_members,
    member_profiles,
    guardian_links,
    audit_logs,
    tickets,
    ticket_comments,
    ticket_status_history,
    notifications,
    notification_preferences,
    notification_templates,
    notification_delivery_logs
TO ttndd_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ttndd_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ttndd_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ttndd_app;

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation_org_members ON org_members;
DROP POLICY IF EXISTS org_isolation_member_profiles ON member_profiles;
DROP POLICY IF EXISTS org_isolation_guardian_links ON guardian_links;
DROP POLICY IF EXISTS org_isolation_audit_logs ON audit_logs;
DROP POLICY IF EXISTS org_isolation_tickets ON tickets;
DROP POLICY IF EXISTS org_isolation_ticket_comments ON ticket_comments;
DROP POLICY IF EXISTS org_isolation_ticket_status_history ON ticket_status_history;
DROP POLICY IF EXISTS org_isolation_notifications ON notifications;
DROP POLICY IF EXISTS org_isolation_notification_preferences ON notification_preferences;
DROP POLICY IF EXISTS org_isolation_notification_templates ON notification_templates;
DROP POLICY IF EXISTS org_isolation_notification_delivery_logs ON notification_delivery_logs;

CREATE POLICY org_isolation_org_members ON org_members
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation_member_profiles ON member_profiles
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation_guardian_links ON guardian_links
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation_audit_logs ON audit_logs
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation_tickets ON tickets
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation_ticket_comments ON ticket_comments
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

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

CREATE POLICY org_isolation_notifications ON notifications
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation_notification_preferences ON notification_preferences
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY org_isolation_notification_templates ON notification_templates
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
    WITH CHECK (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

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
