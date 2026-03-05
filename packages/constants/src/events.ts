export const DOMAIN_EVENTS = {
  // Module 10: Org Config
  ORG: {
    CREATED: 'org.organization_created',
    UPDATED: 'org.organization_updated',
    MODULE_TOGGLED: 'org.module_toggled',
  },

  // Module 1: HRM
  HRM: {
    MEMBER_CREATED: 'hrm.member_created',
    MEMBER_ACTIVATED: 'hrm.member_activated',
    MEMBER_SUSPENDED: 'hrm.member_suspended',
    MEMBER_REINSTATED: 'hrm.member_reinstated',
    MEMBER_TRANSFERRED: 'hrm.member_transferred',
    MEMBER_LEFT: 'hrm.member_left',
    GUARDIAN_LINKED: 'hrm.guardian_linked',
  },

  // Module 9: Rewards
  REWARDS: {
    EXP_AWARDED: 'rewards.exp_awarded',
    EXP_DEDUCTED: 'rewards.exp_deducted',
    BADGE_AWARDED: 'rewards.badge_awarded',
    LEVEL_UP: 'rewards.level_up',
    ITEM_REDEEMED: 'rewards.item_redeemed',
  },

  // Module 8: Scout
  SCOUT: {
    SKILL_STARTED: 'scout.skill_started',
    EVIDENCE_SUBMITTED: 'scout.evidence_submitted',
    SKILL_VERIFIED: 'scout.skill_verified',
    SKILL_AWARDED: 'scout.skill_awarded',
    RANK_ELIGIBLE: 'scout.rank_eligible',
    RANK_PROPOSED: 'scout.rank_proposed',
    RANK_APPROVED: 'scout.rank_approved',
    RANK_AWARDED: 'scout.rank_awarded',
  },

  // Module 8: Sessions
  SESSION: {
    CREATED: 'session.session_created',
    PUBLISHED: 'session.session_published',
    STARTED: 'session.session_started',
    ATTENDANCE_MARKED: 'session.attendance_marked',
    DEBRIEFED: 'session.session_debriefed',
  },

  // Module 8: Events/Camps
  EVENT: {
    CREATED: 'event.event_created',
    PUBLISHED: 'event.event_published',
    REGISTRATION_OPENED: 'event.registration_opened',
    CONSENT_RECEIVED: 'event.consent_received',
    CHECKED_IN: 'event.participant_checked_in',
    COMPLETED: 'event.event_completed',
  },

  // Module 7: LMS
  LMS: {
    COURSE_ENROLLED: 'lms.course_enrolled',
    LESSON_COMPLETED: 'lms.lesson_completed',
    QUIZ_SUBMITTED: 'lms.quiz_submitted',
    QUIZ_PASSED: 'lms.quiz_passed',
    QUIZ_FAILED: 'lms.quiz_failed',
  },

  // Module 2: Projects
  PROJECT: {
    PLAN_SUBMITTED: 'project.plan_submitted',
    PLAN_APPROVED: 'project.plan_approved',
    TASK_COMPLETED: 'project.task_completed',
    PROJECT_COMPLETED: 'project.project_completed',
  },

  // Module 3: Tickets
  TICKET: {
    CREATED: 'ticket.ticket_created',
    ASSIGNED: 'ticket.ticket_assigned',
    RESOLVED: 'ticket.ticket_resolved',
    CLOSED: 'ticket.ticket_closed',
  },

  // Module 4: Finance
  FINANCE: {
    FEE_CREATED: 'finance.fee_created',
    FEE_PAID: 'finance.fee_paid',
    FEE_OVERDUE: 'finance.fee_overdue',
    TRANSACTION_COMPLETED: 'finance.transaction_completed',
  },

  // Module 5: Assets
  ASSET: {
    CHECKED_OUT: 'asset.asset_checked_out',
    RETURNED: 'asset.asset_returned',
    REPORTED_LOST: 'asset.asset_reported_lost',
  },
} as const;
