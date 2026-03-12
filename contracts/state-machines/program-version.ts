/**
 * Program Version State Machine
 *
 * STORY-009 / T-0901 — ProgramVersion.status
 * Module: M8A Scout Core
 *
 * DB: program_versions.status (varchar 20, default 'draft')
 */
import { StateMachineDef } from './types';

export const ProgramVersionStatus = [
  'draft',
  'review',
  'active',
  'archived',
] as const;
export type ProgramVersionStatus = (typeof ProgramVersionStatus)[number];

export const programVersionLifecycle: StateMachineDef<ProgramVersionStatus> = {
  id: 'program_version',
  name: 'Program Version Lifecycle',
  module: 'M8A-Scout',
  prismaModel: 'ProgramVersion',
  dbColumn: 'status',
  dbTable: 'program_versions',
  openApiEnum: 'ProgramVersionStatus',
  states: ProgramVersionStatus,
  initialState: 'draft',
  terminalStates: ['archived'],
  transitions: [
    {
      from: 'draft',
      to: 'review',
      guard: 'all_domains_and_skills_defined',
      actors: ['admin', 'truong'],
      event: 'program_version.submitted',
      auditAction: 'PROGRAM_SUBMIT_REVIEW',
    },
    {
      from: 'review',
      to: 'active',
      guard: 'admin_approves',
      actors: ['admin'],
      event: 'program_version.activated',
      auditAction: 'PROGRAM_ACTIVATE',
      sideEffects: ['archive_previous_active_version'],
    },
    {
      from: 'review',
      to: 'draft',
      guard: 'revisions_requested',
      actors: ['admin'],
      event: 'program_version.returned',
      auditAction: 'PROGRAM_RETURN_DRAFT',
    },
    {
      from: 'active',
      to: 'archived',
      guard: 'newer_version_activated || manual_archive',
      actors: ['admin', 'system'],
      event: 'program_version.archived',
      auditAction: 'PROGRAM_ARCHIVE',
    },
  ],
};
