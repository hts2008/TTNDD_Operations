/**
 * Member Lifecycle State Machine
 *
 * STORY-009 / T-0901 — OrgMember.status
 * Module: M1 HRM
 *
 * DB: org_members.status (varchar 50, default 'active')
 * @see TTNDD_OPS_V3.md §PHẦN IX – Member Lifecycle
 */
import { StateMachineDef } from './types';

export const MemberStatus = [
  'pending',
  'active',
  'inactive',
  'suspended',
  'archived',
] as const;
export type MemberStatus = (typeof MemberStatus)[number];

export const memberLifecycle: StateMachineDef<MemberStatus> = {
  id: 'member_lifecycle',
  name: 'Member Lifecycle',
  module: 'M1-HRM',
  prismaModel: 'OrgMember',
  dbColumn: 'status',
  dbTable: 'org_members',
  openApiEnum: 'MemberStatus',
  states: MemberStatus,
  initialState: 'pending',
  terminalStates: ['archived'],
  transitions: [
    {
      from: 'pending',
      to: 'active',
      guard: 'profile_complete && guardian_consent (if minor)',
      actors: ['admin', 'truong'],
      event: 'member.activated',
      auditAction: 'MEMBER_ACTIVATE',
      sideEffects: ['create_exp_summary', 'assign_default_branch'],
    },
    {
      from: 'pending',
      to: 'archived',
      guard: 'rejection_reason_provided',
      actors: ['admin'],
      event: 'member.rejected',
      auditAction: 'MEMBER_REJECT',
    },
    {
      from: 'active',
      to: 'inactive',
      guard: 'inactivity_threshold_exceeded || manual_deactivation',
      actors: ['admin', 'truong', 'system'],
      event: 'member.deactivated',
      auditAction: 'MEMBER_DEACTIVATE',
    },
    {
      from: 'active',
      to: 'suspended',
      guard: 'disciplinary_reason_provided',
      actors: ['admin'],
      event: 'member.suspended',
      auditAction: 'MEMBER_SUSPEND',
      sideEffects: ['revoke_active_sessions'],
    },
    {
      from: 'inactive',
      to: 'active',
      guard: 'reactivation_approved',
      actors: ['admin', 'truong'],
      event: 'member.reactivated',
      auditAction: 'MEMBER_REACTIVATE',
    },
    {
      from: 'suspended',
      to: 'active',
      guard: 'suspension_lifted',
      actors: ['admin'],
      event: 'member.unsuspended',
      auditAction: 'MEMBER_UNSUSPEND',
    },
    {
      from: 'inactive',
      to: 'archived',
      guard: 'archive_retention_policy_met',
      actors: ['admin', 'system'],
      event: 'member.archived',
      auditAction: 'MEMBER_ARCHIVE',
    },
    {
      from: 'suspended',
      to: 'archived',
      guard: 'permanent_removal_approved',
      actors: ['admin'],
      event: 'member.archived',
      auditAction: 'MEMBER_ARCHIVE',
    },
  ],
};
