/**
 * Session Lifecycle State Machine
 *
 * STORY-009 / T-0901 — Session.status
 * Module: M8B Sessions & Attendance
 *
 * DB: sessions.status (varchar 50, default 'planned')
 * @see TTNDD_OPS_V3.md §PHẦN IX – Session Lifecycle
 */
import { StateMachineDef } from './types';

export const SessionStatus = [
  'draft',
  'planned',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type SessionStatus = (typeof SessionStatus)[number];

export const sessionLifecycle: StateMachineDef<SessionStatus> = {
  id: 'session_lifecycle',
  name: 'Session Lifecycle',
  module: 'M8B-Sessions',
  prismaModel: 'Session',
  dbColumn: 'status',
  dbTable: 'sessions',
  openApiEnum: 'SessionStatus',
  states: SessionStatus,
  initialState: 'draft',
  terminalStates: ['completed', 'cancelled'],
  transitions: [
    {
      from: 'draft',
      to: 'planned',
      guard: 'date_and_branch_set',
      actors: ['truong', 'admin'],
      event: 'session.planned',
      auditAction: 'SESSION_PLAN',
    },
    {
      from: 'planned',
      to: 'in_progress',
      guard: 'session_date_reached || manual_start',
      actors: ['truong', 'system'],
      event: 'session.started',
      auditAction: 'SESSION_START',
    },
    {
      from: 'in_progress',
      to: 'completed',
      guard: 'attendance_recorded',
      actors: ['truong', 'admin'],
      event: 'session.completed',
      auditAction: 'SESSION_COMPLETE',
      sideEffects: ['award_attendance_exp', 'update_member_streaks'],
    },
    {
      from: 'draft',
      to: 'cancelled',
      actors: ['truong', 'admin'],
      event: 'session.cancelled',
      auditAction: 'SESSION_CANCEL',
    },
    {
      from: 'planned',
      to: 'cancelled',
      guard: 'cancellation_reason_provided',
      actors: ['truong', 'admin'],
      event: 'session.cancelled',
      auditAction: 'SESSION_CANCEL',
    },
  ],
};
