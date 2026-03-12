# TTNDD_OPS — State Machine Transition Tables (PHẦN IX)

> Auto-generated from `contracts/state-machines/*.ts`  
> T-0903: Canonical transition tables for V3 spec PHẦN IX compliance

---

## 1. Member Lifecycle (`org_members.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| pending | active | profile_complete && guardian_consent (if minor) | admin, truong | member.activated | MEMBER_ACTIVATE |
| pending | archived | rejection_reason_provided | admin | member.rejected | MEMBER_REJECT |
| active | inactive | inactivity_threshold_exceeded \|\| manual_deactivation | admin, truong, system | member.deactivated | MEMBER_DEACTIVATE |
| active | suspended | disciplinary_reason_provided | admin | member.suspended | MEMBER_SUSPEND |
| inactive | active | reactivation_approved | admin, truong | member.reactivated | MEMBER_REACTIVATE |
| suspended | active | suspension_lifted | admin | member.unsuspended | MEMBER_UNSUSPEND |
| inactive | archived | archive_retention_policy_met | admin, system | member.archived | MEMBER_ARCHIVE |
| suspended | archived | permanent_removal_approved | admin | member.archived | MEMBER_ARCHIVE |

---

## 2. Session Lifecycle (`sessions.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| draft | planned | date_and_branch_set | truong, admin | session.planned | SESSION_PLAN |
| planned | in_progress | session_date_reached \|\| manual_start | truong, system | session.started | SESSION_START |
| in_progress | completed | attendance_recorded | truong, admin | session.completed | SESSION_COMPLETE |
| draft | cancelled | — | truong, admin | session.cancelled | SESSION_CANCEL |
| planned | cancelled | cancellation_reason_provided | truong, admin | session.cancelled | SESSION_CANCEL |

---

## 3. Event Lifecycle (`events.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| planning | published | schedule_and_raci_set | admin, truong | event.published | EVENT_PUBLISH |
| published | registration_open | registration_deadline_set | admin, truong | event.registration_opened | EVENT_OPEN_REG |
| registration_open | registration_closed | deadline_reached \|\| max_participants | admin, truong, system | event.registration_closed | EVENT_CLOSE_REG |
| registration_closed | in_progress | start_date_reached | admin, truong, system | event.started | EVENT_START |
| in_progress | completed | end_date_reached \|\| manual_end | admin, truong | event.completed | EVENT_COMPLETE |
| completed | post_review | post_event_report_submitted | admin, truong | event.reviewed | EVENT_REVIEW |
| planning | cancelled | — | admin | event.cancelled | EVENT_CANCEL |
| published | cancelled | cancellation_reason_provided | admin | event.cancelled | EVENT_CANCEL |
| registration_open | cancelled | cancellation_reason_provided | admin | event.cancelled | EVENT_CANCEL |

---

## 4. Skill Progress (`member_skill_progress.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| not_started | in_progress | member_starts_skill | member, truong | skill.started | SKILL_START |
| in_progress | submitted | evidence_uploaded \|\| criteria_met | member | skill.submitted | SKILL_SUBMIT |
| submitted | verified | verifier_approved | truong, admin | skill.verified | SKILL_VERIFY |
| submitted | rejected | verifier_rejected_with_comment | truong, admin | skill.rejected | SKILL_REJECT |
| rejected | in_progress | member_resubmits | member | skill.restarted | SKILL_RESTART |
| verified | mastered | all_levels_verified | system, truong | skill.mastered | SKILL_MASTER |

---

## 5. Course Progress (`member_course_progress.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| not_started | enrolled | course_is_active && member_eligible | member, truong, admin | course.enrolled | COURSE_ENROLL |
| enrolled | in_progress | first_lesson_accessed | member, system | course.started | COURSE_START |
| in_progress | completed | all_required_lessons_done && quiz_passed | system | course.completed | COURSE_COMPLETE |
| in_progress | failed | max_retries_exceeded \|\| deadline_passed | system | course.failed | COURSE_FAIL |
| enrolled | dropped | — | member, admin | course.dropped | COURSE_DROP |
| in_progress | dropped | — | member, admin | course.dropped | COURSE_DROP |

---

## 6. Rank Progression (`member_ranks.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| not_started | in_progress | member_assigned_to_branch | truong, admin, system | rank.started | RANK_START |
| in_progress | requirements_met | all_required_skills_verified && min_exp_met | system | rank.requirements_met | RANK_REQUIREMENTS_MET |
| requirements_met | verified | truong_approves_rank | truong, admin | rank.verified | RANK_VERIFY |
| verified | awarded | ceremony_completed \|\| admin_approval | admin | rank.awarded | RANK_AWARD |
| awarded | revoked | disciplinary_action \|\| error_correction | admin | rank.revoked | RANK_REVOKE |

---

## 7. Reward Redemption (`reward_redemptions.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| pending | approved | admin_reviews_and_approves | admin, truong | reward.approved | REWARD_APPROVE |
| approved | fulfilled | item_delivered_to_member | admin, truong | reward.fulfilled | REWARD_FULFILL |
| pending | rejected | rejection_reason_provided | admin, truong | reward.rejected | REWARD_REJECT |
| pending | cancelled | — | member | reward.cancelled | REWARD_CANCEL |
| approved | cancelled | admin_or_member_cancels | admin, member | reward.cancelled | REWARD_CANCEL |

---

## 8. Quiz Battle (`quiz_battles.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| waiting | in_progress | host_starts_battle | truong, admin | quiz_battle.started | QUIZ_BATTLE_START |
| in_progress | finished | all_questions_answered \|\| time_expired | system, truong | quiz_battle.finished | QUIZ_BATTLE_FINISH |
| waiting | cancelled | — | truong, admin | quiz_battle.cancelled | QUIZ_BATTLE_CANCEL |
| in_progress | cancelled | host_aborts | truong, admin | quiz_battle.cancelled | QUIZ_BATTLE_CANCEL |

---

## 9. Program Version (`program_versions.status`)

| From | To | Guard | Actors | Event | Audit Action |
|------|----|-------|--------|-------|--------------|
| draft | review | all_domains_and_skills_defined | admin, truong | program_version.submitted | PROGRAM_SUBMIT_REVIEW |
| review | active | admin_approves | admin | program_version.activated | PROGRAM_ACTIVATE |
| review | draft | revisions_requested | admin | program_version.returned | PROGRAM_RETURN_DRAFT |
| active | archived | newer_version_activated \|\| manual_archive | admin, system | program_version.archived | PROGRAM_ARCHIVE |
