/**
 * Rank Progression State Machine
 *
 * STORY-009 / T-0901 — MemberRank.status
 * Module: M8A Scout Core
 *
 * DB: member_ranks.status (varchar 50, default 'in_progress')
 */
import { StateMachineDef } from './types';

export const RankStatus = [
  'not_started',
  'in_progress',
  'requirements_met',
  'verified',
  'awarded',
  'revoked',
] as const;
export type RankStatus = (typeof RankStatus)[number];

export const rankProgressionLifecycle: StateMachineDef<RankStatus> = {
  id: 'rank_progression',
  name: 'Rank Progression Lifecycle',
  module: 'M8A-Scout',
  prismaModel: 'MemberRank',
  dbColumn: 'status',
  dbTable: 'member_ranks',
  openApiEnum: 'RankStatus',
  states: RankStatus,
  initialState: 'not_started',
  terminalStates: ['awarded', 'revoked'],
  transitions: [
    {
      from: 'not_started',
      to: 'in_progress',
      guard: 'member_assigned_to_branch',
      actors: ['truong', 'admin', 'system'],
      event: 'rank.started',
      auditAction: 'RANK_START',
    },
    {
      from: 'in_progress',
      to: 'requirements_met',
      guard: 'all_required_skills_verified && min_exp_met',
      actors: ['system'],
      event: 'rank.requirements_met',
      auditAction: 'RANK_REQUIREMENTS_MET',
    },
    {
      from: 'requirements_met',
      to: 'verified',
      guard: 'truong_approves_rank',
      actors: ['truong', 'admin'],
      event: 'rank.verified',
      auditAction: 'RANK_VERIFY',
    },
    {
      from: 'verified',
      to: 'awarded',
      guard: 'ceremony_completed || admin_approval',
      actors: ['admin'],
      event: 'rank.awarded',
      auditAction: 'RANK_AWARD',
      sideEffects: ['award_rank_badge', 'award_rank_exp', 'notify_member'],
    },
    {
      from: 'awarded',
      to: 'revoked',
      guard: 'disciplinary_action || error_correction',
      actors: ['admin'],
      event: 'rank.revoked',
      auditAction: 'RANK_REVOKE',
    },
  ],
};
