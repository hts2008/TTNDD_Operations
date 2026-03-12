/**
 * Skill Progress State Machine
 *
 * STORY-009 / T-0901 — MemberSkillProgress.status
 * Module: M8A Scout Core
 *
 * DB: member_skill_progress.status (varchar 30, default 'not_started')
 */
import { StateMachineDef } from './types';

export const SkillProgressStatus = [
  'not_started',
  'in_progress',
  'submitted',
  'verified',
  'mastered',
  'rejected',
] as const;
export type SkillProgressStatus = (typeof SkillProgressStatus)[number];

export const skillProgressLifecycle: StateMachineDef<SkillProgressStatus> = {
  id: 'skill_progress',
  name: 'Skill Progress Lifecycle',
  module: 'M8A-Scout',
  prismaModel: 'MemberSkillProgress',
  dbColumn: 'status',
  dbTable: 'member_skill_progress',
  openApiEnum: 'SkillProgressStatus',
  states: SkillProgressStatus,
  initialState: 'not_started',
  terminalStates: ['mastered'],
  transitions: [
    {
      from: 'not_started',
      to: 'in_progress',
      guard: 'member_starts_skill',
      actors: ['member', 'truong'],
      event: 'skill.started',
      auditAction: 'SKILL_START',
    },
    {
      from: 'in_progress',
      to: 'submitted',
      guard: 'evidence_uploaded || criteria_met',
      actors: ['member'],
      event: 'skill.submitted',
      auditAction: 'SKILL_SUBMIT',
    },
    {
      from: 'submitted',
      to: 'verified',
      guard: 'verifier_approved',
      actors: ['truong', 'admin'],
      event: 'skill.verified',
      auditAction: 'SKILL_VERIFY',
      sideEffects: ['award_skill_exp', 'check_rank_eligibility'],
    },
    {
      from: 'submitted',
      to: 'rejected',
      guard: 'verifier_rejected_with_comment',
      actors: ['truong', 'admin'],
      event: 'skill.rejected',
      auditAction: 'SKILL_REJECT',
    },
    {
      from: 'rejected',
      to: 'in_progress',
      guard: 'member_resubmits',
      actors: ['member'],
      event: 'skill.restarted',
      auditAction: 'SKILL_RESTART',
    },
    {
      from: 'verified',
      to: 'mastered',
      guard: 'all_levels_verified',
      actors: ['system', 'truong'],
      event: 'skill.mastered',
      auditAction: 'SKILL_MASTER',
      sideEffects: ['award_mastery_badge', 'update_rank_progress'],
    },
  ],
};
