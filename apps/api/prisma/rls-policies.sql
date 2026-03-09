-- ============================================================
-- ROW LEVEL SECURITY POLICIES — TTNDD_OPS
-- ============================================================
-- Applied AFTER Prisma migration creates tables.
-- Run via: psql -f prisma/rls-policies.sql
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS precedes each CREATE).
--
-- IMPORTANT: Uses FORCE ROW LEVEL SECURITY on all tenant tables
--   so that even the table owner (ttndd user / Prisma) is subject to RLS.
--   This means ALL queries MUST set app.current_org_id via set_config()
--   or they will see zero rows. Use PrismaService.withRLS() for this.
--
-- Coverage: ALL 55 tenant-scoped tables with org_id
-- Excluded (no org_id):
--   organizations  — IS the tenant root
--   users          — cross-tenant identity
--   ticket_status_history — linked via ticket FK (parent has RLS)
--   notification_delivery_logs — linked via notification FK (parent has RLS)
--   release_gate_reports — system-level, no tenant scope
-- ============================================================

-- ============================================================
-- 1. ENABLE + FORCE ROW LEVEL SECURITY (T-0027)
-- ============================================================
-- FORCE ensures RLS applies even to the table owner (ttndd user).
-- Without FORCE, Prisma (which connects as ttndd = table owner)
-- would bypass all policies.
-- ============================================================

-- 1A. Core
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE units           ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE domain_events   ENABLE ROW LEVEL SECURITY;

ALTER TABLE branches        FORCE ROW LEVEL SECURITY;
ALTER TABLE units           FORCE ROW LEVEL SECURITY;
ALTER TABLE org_members     FORCE ROW LEVEL SECURITY;
ALTER TABLE domain_events   FORCE ROW LEVEL SECURITY;

-- 1B. Audit
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- 1C. HRM (Module 1)
ALTER TABLE member_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_branch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_chart_nodes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE member_branch_history FORCE ROW LEVEL SECURITY;
ALTER TABLE org_chart_nodes       FORCE ROW LEVEL SECURITY;

-- 1D. Reward Engine (Module 9)
ALTER TABLE exp_configs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exp_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_exp_summary     ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_badges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots  ENABLE ROW LEVEL SECURITY;
ALTER TABLE exp_configs            FORCE ROW LEVEL SECURITY;
ALTER TABLE exp_transactions       FORCE ROW LEVEL SECURITY;
ALTER TABLE member_exp_summary     FORCE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions      FORCE ROW LEVEL SECURITY;
ALTER TABLE member_badges          FORCE ROW LEVEL SECURITY;
ALTER TABLE reward_items           FORCE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions     FORCE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots  FORCE ROW LEVEL SECURITY;

-- 1E. Scout Core (Module 8A)
ALTER TABLE rank_definitions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_skill_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_ranks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rank_definitions       FORCE ROW LEVEL SECURITY;
ALTER TABLE skill_groups           FORCE ROW LEVEL SECURITY;
ALTER TABLE skills                 FORCE ROW LEVEL SECURITY;
ALTER TABLE member_skill_progress  FORCE ROW LEVEL SECURITY;
ALTER TABLE member_ranks           FORCE ROW LEVEL SECURITY;

-- 1F. Sessions & Attendance (Module 8B)
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_programs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions              FORCE ROW LEVEL SECURITY;
ALTER TABLE session_attendance    FORCE ROW LEVEL SECURITY;
ALTER TABLE annual_programs       FORCE ROW LEVEL SECURITY;

-- 1G. Events & Camps (Module 8C)
ALTER TABLE events                ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events                FORCE ROW LEVEL SECURITY;
ALTER TABLE event_registrations   FORCE ROW LEVEL SECURITY;

-- 1H. LMS (Module 7)
ALTER TABLE courses                ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons                ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_battles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses                FORCE ROW LEVEL SECURITY;
ALTER TABLE lessons                FORCE ROW LEVEL SECURITY;
ALTER TABLE quizzes                FORCE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions         FORCE ROW LEVEL SECURITY;
ALTER TABLE quiz_battles           FORCE ROW LEVEL SECURITY;
ALTER TABLE member_course_progress FORCE ROW LEVEL SECURITY;

-- 1I. Enrichment (Module 8D)
ALTER TABLE spiritual_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ngu_gioi_assessments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentoring_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentoring_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE spiritual_logs         FORCE ROW LEVEL SECURITY;
ALTER TABLE ngu_gioi_assessments   FORCE ROW LEVEL SECURITY;
ALTER TABLE evaluations            FORCE ROW LEVEL SECURITY;
ALTER TABLE mentoring_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE mentoring_logs         FORCE ROW LEVEL SECURITY;

-- 1J. Projects (Module 2)
ALTER TABLE plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans          FORCE ROW LEVEL SECURITY;
ALTER TABLE projects       FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks          FORCE ROW LEVEL SECURITY;

-- 1K. Tickets (Module 3)
ALTER TABLE tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets         FORCE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments FORCE ROW LEVEL SECURITY;

-- 1L. Finance (Module 4)
ALTER TABLE financial_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_fees            ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_accounts     FORCE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE member_fees            FORCE ROW LEVEL SECURITY;

-- 1M. Assets (Module 5)
ALTER TABLE asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_loans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE assets           FORCE ROW LEVEL SECURITY;
ALTER TABLE asset_loans      FORCE ROW LEVEL SECURITY;

-- 1N. Process/SOP (Module 6)
ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_definitions FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs        FORCE ROW LEVEL SECURITY;

-- 1O. Notifications
ALTER TABLE notifications             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications             FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences  FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_templates    FORCE ROW LEVEL SECURITY;

-- 1P. File Storage
ALTER TABLE file_object_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_object_refs FORCE ROW LEVEL SECURITY;

-- 1Q. Data Import
ALTER TABLE import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_batches FORCE ROW LEVEL SECURITY;


-- ============================================================
-- 2. DROP EXISTING POLICIES (idempotent re-runs) (T-0028)
-- ============================================================

-- Core
DROP POLICY IF EXISTS "org_isolation_branches"      ON branches;
DROP POLICY IF EXISTS "org_isolation_units"          ON units;
DROP POLICY IF EXISTS "org_isolation_org_members"    ON org_members;
DROP POLICY IF EXISTS "user_own_data_org_members"    ON org_members;
DROP POLICY IF EXISTS "org_isolation_domain_events"  ON domain_events;

-- Audit
DROP POLICY IF EXISTS "org_isolation_audit_logs"     ON audit_logs;

-- HRM
DROP POLICY IF EXISTS "org_isolation_member_profiles"       ON member_profiles;
DROP POLICY IF EXISTS "org_isolation_member_branch_history"  ON member_branch_history;
DROP POLICY IF EXISTS "org_isolation_org_chart_nodes"        ON org_chart_nodes;

-- Reward Engine
DROP POLICY IF EXISTS "org_isolation_exp_configs"            ON exp_configs;
DROP POLICY IF EXISTS "org_isolation_exp_transactions"       ON exp_transactions;
DROP POLICY IF EXISTS "org_isolation_member_exp_summary"     ON member_exp_summary;
DROP POLICY IF EXISTS "org_isolation_badge_definitions"      ON badge_definitions;
DROP POLICY IF EXISTS "org_isolation_member_badges"          ON member_badges;
DROP POLICY IF EXISTS "org_isolation_reward_items"           ON reward_items;
DROP POLICY IF EXISTS "org_isolation_reward_redemptions"     ON reward_redemptions;
DROP POLICY IF EXISTS "org_isolation_leaderboard_snapshots"  ON leaderboard_snapshots;

-- Scout Core
DROP POLICY IF EXISTS "org_isolation_rank_definitions"       ON rank_definitions;
DROP POLICY IF EXISTS "org_isolation_skill_groups"           ON skill_groups;
DROP POLICY IF EXISTS "org_isolation_skills"                 ON skills;
DROP POLICY IF EXISTS "org_isolation_member_skill_progress"  ON member_skill_progress;
DROP POLICY IF EXISTS "org_isolation_member_ranks"           ON member_ranks;

-- Sessions & Attendance
DROP POLICY IF EXISTS "org_isolation_sessions"              ON sessions;
DROP POLICY IF EXISTS "org_isolation_session_attendance"     ON session_attendance;
DROP POLICY IF EXISTS "org_isolation_annual_programs"        ON annual_programs;

-- Events
DROP POLICY IF EXISTS "org_isolation_events"                ON events;
DROP POLICY IF EXISTS "org_isolation_event_registrations"   ON event_registrations;

-- LMS
DROP POLICY IF EXISTS "org_isolation_courses"                ON courses;
DROP POLICY IF EXISTS "org_isolation_lessons"                ON lessons;
DROP POLICY IF EXISTS "org_isolation_quizzes"                ON quizzes;
DROP POLICY IF EXISTS "org_isolation_quiz_questions"         ON quiz_questions;
DROP POLICY IF EXISTS "org_isolation_quiz_battles"           ON quiz_battles;
DROP POLICY IF EXISTS "org_isolation_member_course_progress" ON member_course_progress;

-- Enrichment
DROP POLICY IF EXISTS "org_isolation_spiritual_logs"          ON spiritual_logs;
DROP POLICY IF EXISTS "org_isolation_ngu_gioi_assessments"    ON ngu_gioi_assessments;
DROP POLICY IF EXISTS "org_isolation_evaluations"             ON evaluations;
DROP POLICY IF EXISTS "org_isolation_mentoring_relationships" ON mentoring_relationships;
DROP POLICY IF EXISTS "org_isolation_mentoring_logs"          ON mentoring_logs;

-- Projects
DROP POLICY IF EXISTS "org_isolation_plans"     ON plans;
DROP POLICY IF EXISTS "org_isolation_projects"  ON projects;
DROP POLICY IF EXISTS "org_isolation_tasks"     ON tasks;

-- Tickets
DROP POLICY IF EXISTS "org_isolation_tickets"         ON tickets;
DROP POLICY IF EXISTS "org_isolation_ticket_comments"  ON ticket_comments;

-- Finance
DROP POLICY IF EXISTS "org_isolation_financial_accounts"     ON financial_accounts;
DROP POLICY IF EXISTS "org_isolation_financial_transactions"  ON financial_transactions;
DROP POLICY IF EXISTS "org_isolation_member_fees"             ON member_fees;

-- Assets
DROP POLICY IF EXISTS "org_isolation_asset_categories" ON asset_categories;
DROP POLICY IF EXISTS "org_isolation_assets"           ON assets;
DROP POLICY IF EXISTS "org_isolation_asset_loans"      ON asset_loans;

-- Process/SOP
DROP POLICY IF EXISTS "org_isolation_workflow_definitions" ON workflow_definitions;
DROP POLICY IF EXISTS "org_isolation_workflow_runs"        ON workflow_runs;

-- Notifications
DROP POLICY IF EXISTS "org_isolation_notifications"            ON notifications;
DROP POLICY IF EXISTS "org_isolation_notification_preferences"  ON notification_preferences;
DROP POLICY IF EXISTS "org_isolation_notification_templates"    ON notification_templates;

-- File Storage
DROP POLICY IF EXISTS "org_isolation_file_object_refs" ON file_object_refs;

-- Data Import
DROP POLICY IF EXISTS "org_isolation_import_batches" ON import_batches;


-- ============================================================
-- 3. CREATE POLICIES — org_isolation (T-0028 + WITH CHECK)
-- ============================================================
-- USING  = filter rows on SELECT/UPDATE/DELETE (read path)
-- WITH CHECK = validate rows on INSERT/UPDATE (write path)
-- Together they provide full read + write tenant isolation.
-- current_setting('app.current_org_id', true) returns NULL if unset,
-- causing the comparison to fail → zero rows visible (fail-safe).
-- ============================================================

-- ---- Core ----

CREATE POLICY "org_isolation_branches" ON branches
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_units" ON units
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_org_members" ON org_members
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- Org Members: fine-grained SELECT — admins see all, users see only own + linked
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

CREATE POLICY "org_isolation_domain_events" ON domain_events
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Audit ----

CREATE POLICY "org_isolation_audit_logs" ON audit_logs
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- HRM (Module 1) ----

CREATE POLICY "org_isolation_member_profiles" ON member_profiles
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_member_branch_history" ON member_branch_history
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_org_chart_nodes" ON org_chart_nodes
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Reward Engine (Module 9) ----

CREATE POLICY "org_isolation_exp_configs" ON exp_configs
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_exp_transactions" ON exp_transactions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_member_exp_summary" ON member_exp_summary
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_badge_definitions" ON badge_definitions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_member_badges" ON member_badges
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_reward_items" ON reward_items
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_reward_redemptions" ON reward_redemptions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_leaderboard_snapshots" ON leaderboard_snapshots
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Scout Core (Module 8A) ----

CREATE POLICY "org_isolation_rank_definitions" ON rank_definitions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_skill_groups" ON skill_groups
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_skills" ON skills
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_member_skill_progress" ON member_skill_progress
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_member_ranks" ON member_ranks
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Sessions & Attendance (Module 8B) ----

CREATE POLICY "org_isolation_sessions" ON sessions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_session_attendance" ON session_attendance
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_annual_programs" ON annual_programs
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Events & Camps (Module 8C) ----

CREATE POLICY "org_isolation_events" ON events
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_event_registrations" ON event_registrations
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- LMS (Module 7) ----

CREATE POLICY "org_isolation_courses" ON courses
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_lessons" ON lessons
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_quizzes" ON quizzes
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_quiz_questions" ON quiz_questions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_quiz_battles" ON quiz_battles
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_member_course_progress" ON member_course_progress
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Enrichment (Module 8D) ----

CREATE POLICY "org_isolation_spiritual_logs" ON spiritual_logs
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_ngu_gioi_assessments" ON ngu_gioi_assessments
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_evaluations" ON evaluations
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_mentoring_relationships" ON mentoring_relationships
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_mentoring_logs" ON mentoring_logs
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Projects (Module 2) ----

CREATE POLICY "org_isolation_plans" ON plans
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_projects" ON projects
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_tasks" ON tasks
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Tickets (Module 3) ----

CREATE POLICY "org_isolation_tickets" ON tickets
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_ticket_comments" ON ticket_comments
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Finance (Module 4) ----

CREATE POLICY "org_isolation_financial_accounts" ON financial_accounts
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_financial_transactions" ON financial_transactions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_member_fees" ON member_fees
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Assets (Module 5) ----

CREATE POLICY "org_isolation_asset_categories" ON asset_categories
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_assets" ON assets
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_asset_loans" ON asset_loans
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Process/SOP (Module 6) ----

CREATE POLICY "org_isolation_workflow_definitions" ON workflow_definitions
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_workflow_runs" ON workflow_runs
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Notifications ----

CREATE POLICY "org_isolation_notifications" ON notifications
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_notification_preferences" ON notification_preferences
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

CREATE POLICY "org_isolation_notification_templates" ON notification_templates
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- File Storage ----

CREATE POLICY "org_isolation_file_object_refs" ON file_object_refs
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);

-- ---- Data Import ----

CREATE POLICY "org_isolation_import_batches" ON import_batches
    USING (org_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid);


-- ============================================================
-- 4. APPLICATION USER + GRANTS
-- ============================================================
-- IMPORTANT: ttndd is SUPERUSER (bypasses ALL RLS).
-- For RLS to work, the application MUST connect as a non-superuser.
-- ttndd_app is created as NOSUPERUSER with full table access
-- but still subject to RLS policies.
-- ============================================================

-- Create app user (idempotent via DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ttndd_app') THEN
        CREATE ROLE ttndd_app LOGIN PASSWORD 'ttndd_local' NOSUPERUSER INHERIT;
    END IF;
END
$$;

-- Grant schema usage and table access to app user
GRANT USAGE ON SCHEMA public TO ttndd_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO ttndd_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ttndd_app;
-- Ensure future tables also get grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ttndd_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ttndd_app;

-- Also keep existing grants for migration user
GRANT ALL ON ALL TABLES IN SCHEMA public TO ttndd;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO ttndd;
