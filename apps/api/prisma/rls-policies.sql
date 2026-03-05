-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Applied AFTER Prisma migration creates tables.
-- Run via: psql -f prisma/rls-policies.sql
-- ============================================================

-- Enable RLS on all tenant-scoped tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (idempotent re-runs)
DROP POLICY IF EXISTS "org_isolation_branches" ON branches;
DROP POLICY IF EXISTS "org_isolation_units" ON units;
DROP POLICY IF EXISTS "org_isolation_org_members" ON org_members;
DROP POLICY IF EXISTS "org_isolation_domain_events" ON domain_events;
DROP POLICY IF EXISTS "user_own_data_org_members" ON org_members;

-- Branches: org isolation
CREATE POLICY "org_isolation_branches" ON branches
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Units: org isolation
CREATE POLICY "org_isolation_units" ON units
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Org Members: org isolation
CREATE POLICY "org_isolation_org_members" ON org_members
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Org Members: fine-grained — admins see all, users see only own + linked
CREATE POLICY "user_own_data_org_members" ON org_members
    FOR SELECT
    USING (
        org_id = current_setting('app.current_org_id', true)::uuid
        AND (
            current_setting('app.user_role', true) IN ('super_admin', 'admin')
            OR id = current_setting('app.current_member_id', true)::uuid
            OR id IN (
                SELECT linked_member_id FROM org_members
                WHERE id = current_setting('app.current_member_id', true)::uuid
            )
        )
    );

-- Domain Events: org isolation
CREATE POLICY "org_isolation_domain_events" ON domain_events
    USING (org_id = current_setting('app.current_org_id', true)::uuid);

-- Grant app user access (Prisma connects as 'ttndd' user)
-- The RLS policies above restrict what rows are visible
GRANT ALL ON ALL TABLES IN SCHEMA public TO ttndd;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ttndd;
