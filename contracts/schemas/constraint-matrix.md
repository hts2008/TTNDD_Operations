# T-0908: Index, Unique, Check & FK Constraint Matrix

> **Source:** `apps/api/prisma/schema.prisma` | 60 models
> **Generated:** 2026-03-12 | **STORY-009 / WP-9.2 / M9.2**

---

## Unique Constraints

| Table | Columns | Prisma Directive |
|-------|---------|------------------|
| organizations | (slug) | @unique |
| users | (firebase_uid) | @unique |
| users | (email) | @unique |
| branches | (org_id, code) | @@unique |
| org_members | (org_id, user_id) | @@unique |
| member_profiles | (org_member_id) | @unique |
| guardian_links | (org_member_id, full_name, relation) | @@unique |
| member_exp_summary | (org_member_id) | @unique |
| exp_configs | (org_id, event_type) | @@unique |
| badge_definitions | (org_id, badge_code) | @@unique |
| member_badges | (org_member_id, badge_id) | @@unique |
| program_versions | (org_id, version_name) | @@unique |
| domains | (org_id, code) | @@unique |
| rank_definitions | (org_id, branch_id, rank_code) | @@unique |
| member_skill_progress | (org_member_id, skill_id) | @@unique |
| habit_defs | (org_id, key) | @@unique |
| habit_logs | (person_id, habit_def_id, log_date) | @@unique |
| achievement_defs | (org_id, key) | @@unique |
| member_ranks | (org_member_id, branch_id, rank_id) | @@unique |
| session_attendance | (session_id, org_member_id) | @@unique |
| annual_programs | (org_id, branch_id, year) | @@unique |
| event_registrations | (event_id, org_member_id) | @@unique |
| member_course_progress | (org_member_id, course_id) | @@unique |
| quiz_battles | (game_code) | @unique |
| spiritual_logs | (org_member_id, log_date, log_type) | @@unique |
| ngu_gioi_assessments | (org_member_id, week_start) | @@unique |
| mentoring_relationships | (org_id, mentor_id, mentee_id) | @@unique |
| assets | (asset_code) | @unique |
| task_dependencies | (source_task_id, target_task_id) | @@unique |
| notification_preferences | (user_id, channel, event_type) | @@unique |
| notification_templates | (org_id, event_type, channel) | @@unique |
| ticket_sla_configs | (org_id, priority) | @@unique |
| onboarding_templates | (org_id, role_type, name) | @@unique |
| onboarding_progress | (org_member_id, template_id) | @@unique |

**Total unique constraints: 34**

---

## Composite Indexes (@@index)

| Table | Columns | Purpose |
|-------|---------|---------|
| audit_logs | (org_id, action) | Action-based audit query |
| audit_logs | (org_id, resource, resource_id) | Resource-specific audit |
| audit_logs | (org_id, created_at) | Time-range audit |
| member_profiles | (org_id) | Tenant filter |
| guardian_links | (org_id) | Tenant filter |
| guardian_links | (org_member_id) | Member lookup |
| guardian_links | (user_id) | Parent login lookup |
| child_data_access_logs | (org_id, child_member_id) | COPPA audit |
| child_data_access_logs | (org_id, accessor_user_id) | Access audit |
| child_data_access_logs | (accessed_at) | Time-range |
| member_branch_history | (org_id, org_member_id) | History lookup |
| org_chart_nodes | (org_id) | Tenant filter |
| org_chart_nodes | (org_id, is_active) | Active nodes only |
| volunteer_availability | (org_id, org_member_id) | Member schedule |
| volunteer_availability | (org_id, date) | Date-based query |
| exp_transactions | (org_id, org_member_id) | Member EXP |
| exp_transactions | (org_id, created_at) | Time-range |
| member_exp_summary | (org_id) | Tenant filter |
| member_badges | (org_id) | Tenant filter |
| reward_items | (org_id) | Tenant filter |
| reward_redemptions | (org_id) | Tenant filter |
| leaderboard_snapshots | (org_id, scope, snapshot_date) | Board query |
| sessions | (org_id, session_date) | Date query |
| events | (org_id, start_date) | Date query |
| courses | (org_id) | Tenant filter |
| quizzes | (org_id) | Tenant filter |
| quiz_attempts | (org_id) | Tenant filter |
| quiz_attempts | (org_member_id, quiz_id) | Member attempts |
| course_assignments | (org_id) | Tenant filter |
| course_assignments | (org_member_id) | Member assignments |
| evaluations | (org_id, org_member_id) | Member evals |
| plans | (org_id) | Tenant filter |
| plan_revisions | (plan_id) | Revision lookup |
| plan_revisions | (org_id) | Tenant filter |
| projects | (org_id) | Tenant filter |
| project_phases | (org_id, project_id) | Project phases |
| tasks | (org_id, project_id) | Project tasks |
| project_comments | (org_id, project_id) | Comments |
| project_comments | (task_id) | Task comments |
| task_dependencies | (org_id, project_id) | Dependencies |
| project_documents | (org_id, project_id) | Documents |
| time_entries | (org_id, project_id) | Time tracking |
| time_entries | (task_id) | Task time |
| cost_entries | (org_id, project_id) | Cost tracking |
| tickets | (org_id, status) | Status filter |
| ticket_routing_rules | (org_id, is_active) | Active rules |
| ticket_attachments | (org_id, ticket_id) | Attachments |
| financial_accounts | (org_id) | Tenant filter |
| financial_transactions | (org_id, transaction_date) | Date query |
| member_fees | (org_id, org_member_id) | Fee lookup |
| fee_plans | (org_id) | Tenant filter |
| fee_installments | (org_id, member_fee_id) | Installments |
| sponsors | (org_id) | Tenant filter |
| sponsor_contributions | (org_id, sponsor_id) | Contributions |
| asset_categories | (org_id) | Tenant filter |
| assets | (org_id) | Tenant filter |
| asset_custom_fields | (org_id, asset_id) | Fields |
| asset_loans | (org_id) | Tenant filter |
| kit_templates | (org_id) | Tenant filter |
| kit_items | (org_id, kit_template_id) | Items |
| uniform_issues | (org_id, member_id) | Issues |
| maintenance_schedules | (org_id, asset_id) | Schedules |
| workflow_definitions | (org_id, is_active) | Active workflows |
| workflow_runs | (org_id, status) | Status filter |
| notifications | (org_id, recipient_id, is_read) | Unread query |
| notifications | (org_id, created_at) | Time query |
| notification_preferences | (org_id, user_id) | Prefs |
| notification_delivery_logs | (status, retry_count) | Retry queue |
| domain_events | (org_id, event_type) | Event query |
| domain_events | (processed, created_at) | Outbox polling |
| file_object_refs | (org_id, entity_type, entity_id) | Entity files |
| file_object_refs | (org_id, uploaded_at) | Upload history |
| release_gate_reports | (environment, created_at) | Env reports |
| import_batches | (org_id, import_type) | Import tracking |
| transfer_cases | (org_id, status) | Status filter |
| transfer_cases | (org_id, org_member_id) | Member transfers |
| onboarding_progress | (org_id, org_member_id) | Progress |
| training_records | (org_id, org_member_id) | Records |
| training_records | (org_id, expires_at) | Expiry alerts |
| approval_definitions | (org_id, entity_type) | Type filter |
| approval_requests | (org_id, status) | Status filter |
| approval_requests | (org_id, entity_type, entity_id) | Entity lookup |
| sop_documents | (org_id, status) | Status filter |
| sop_documents | (org_id, category) | Category filter |
| workflow_triggers | (org_id, event_type) | Event routing |

**Total composite indexes: 83**

---

## Foreign Key Matrix

| Table | Column | References | On Delete |
|-------|--------|-----------|-----------|
| branches | org_id | organizations.id | CASCADE |
| units | org_id | organizations.id | — |
| units | branch_id | branches.id | — |
| units | parent_unit_id | units.id (self) | — |
| org_members | org_id | organizations.id | CASCADE |
| org_members | user_id | users.id | CASCADE |
| org_members | branch_id | branches.id | — |
| org_members | unit_id | units.id | — |
| org_members | linked_member_id | org_members.id (self) | — |
| member_profiles | org_member_id | org_members.id | CASCADE |
| guardian_links | org_member_id | org_members.id | CASCADE |
| member_branch_history | org_member_id | org_members.id | — |
| org_chart_nodes | parent_node_id | org_chart_nodes.id (self) | — |
| org_chart_nodes | org_member_id | org_members.id | — |
| volunteer_availability | org_member_id | org_members.id | — |
| exp_transactions | org_member_id | org_members.id | — |
| member_exp_summary | org_member_id | org_members.id | — |
| member_badges | org_member_id | org_members.id | — |
| member_badges | badge_id | badge_definitions.id | — |
| reward_redemptions | org_member_id | org_members.id | — |
| reward_redemptions | reward_id | reward_items.id | — |
| domains | version_id | program_versions.id | — |
| skill_criteria | skill_id | skills.id | — |
| skills | skill_group_id | skill_groups.id | — |
| skills | domain_id | domains.id | — |
| rank_definitions | branch_id | branches.id | — |
| rank_definitions | version_id | program_versions.id | — |
| member_skill_progress | org_member_id | org_members.id | — |
| member_skill_progress | skill_id | skills.id | — |
| skill_evidence | progress_id | member_skill_progress.id | — |
| skill_verifications | progress_id | member_skill_progress.id | — |
| habit_logs | habit_def_id | habit_defs.id | — |
| achievement_awards | achievement_def_id | achievement_defs.id | — |
| member_ranks | org_member_id | org_members.id | — |
| member_ranks | rank_id | rank_definitions.id | — |
| sessions | branch_id | branches.id | — |
| session_attendance | session_id | sessions.id | — |
| session_attendance | org_member_id | org_members.id | — |
| events (registrations) | event_id | events.id | — |
| event_registrations | org_member_id | org_members.id | — |
| courses (lessons) | course_id | courses.id | CASCADE |
| quiz_questions | quiz_id | quizzes.id | CASCADE |
| quizzes | course_id | courses.id | — |
| quiz_battles | quiz_id | quizzes.id | — |
| member_course_progress | org_member_id | org_members.id | — |
| member_course_progress | course_id | courses.id | — |
| course_assignments | course_id | courses.id | CASCADE |
| course_assignments | org_member_id | org_members.id | — |
| quiz_attempts | quiz_id | quizzes.id | CASCADE |
| quiz_attempts | org_member_id | org_members.id | — |
| spiritual_logs | org_member_id | org_members.id | — |
| ngu_gioi_assessments | org_member_id | org_members.id | — |
| evaluations | org_member_id | org_members.id | — |
| mentoring_logs | relationship_id | mentoring_relationships.id | — |
| plan_revisions | plan_id | plans.id | — |
| project_phases | project_id | projects.id | — |
| project_phases | parent_id | project_phases.id (self) | — |
| tasks | project_id | projects.id | — |
| tasks | phase_id | project_phases.id | — |
| tasks | parent_task_id | tasks.id (self) | — |
| project_comments | project_id | projects.id | — |
| project_comments | task_id | tasks.id | — |
| ticket_comments | ticket_id | tickets.id | CASCADE |
| ticket_status_history | ticket_id | tickets.id | — |
| ticket_attachments | ticket_id | tickets.id | CASCADE |
| approval_requests | definition_id | approval_definitions.id | — |
| financial_transactions | account_id | financial_accounts.id | — |
| member_fees | org_member_id | org_members.id | — |
| member_fees | fee_plan_id | fee_plans.id | — |
| fee_installments | member_fee_id | member_fees.id | — |
| sponsor_contributions | sponsor_id | sponsors.id | — |
| assets | category_id | asset_categories.id | — |
| asset_custom_fields | asset_id | assets.id | — |
| asset_loans | asset_id | assets.id | — |
| kit_items | kit_template_id | kit_templates.id | — |
| workflow_runs | definition_id | workflow_definitions.id | — |
| notification_delivery_logs | notification_id | notifications.id | CASCADE |
| domain_events | org_id | organizations.id | — |
| domain_events | actor_user_id | users.id | — |
| onboarding_progress | template_id | onboarding_templates.id | — |

**Total FKs: 80** | **CASCADE delete: 10** | **Default (RESTRICT): 70**

---

## Summary

| Constraint Type | Count |
|----------------|-------|
| Unique constraints | 34 |
| Composite indexes | 83 |
| Foreign keys | 80 |
| Self-referencing FKs | 5 |
| CASCADE delete FKs | 10 |
| Check constraints | 0 (enforced at app layer via Prisma validation) |
