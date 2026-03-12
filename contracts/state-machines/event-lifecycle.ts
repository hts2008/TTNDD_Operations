/**
 * Event Lifecycle State Machine
 *
 * STORY-009 / T-0901 — Event.status
 * Module: M8C Events & Camps
 *
 * DB: events.status (varchar 50, default 'planning')
 * @see TTNDD_OPS_V3.md §PHẦN IX – Event Lifecycle
 */
import { StateMachineDef } from './types';

export const EventStatus = [
  'planning',
  'published',
  'registration_open',
  'registration_closed',
  'in_progress',
  'completed',
  'cancelled',
  'post_review',
] as const;
export type EventStatus = (typeof EventStatus)[number];

export const eventLifecycle: StateMachineDef<EventStatus> = {
  id: 'event_lifecycle',
  name: 'Event Lifecycle',
  module: 'M8C-Events',
  prismaModel: 'Event',
  dbColumn: 'status',
  dbTable: 'events',
  openApiEnum: 'EventStatus',
  states: EventStatus,
  initialState: 'planning',
  terminalStates: ['completed', 'cancelled', 'post_review'],
  transitions: [
    {
      from: 'planning',
      to: 'published',
      guard: 'schedule_and_raci_set',
      actors: ['admin', 'truong'],
      event: 'event.published',
      auditAction: 'EVENT_PUBLISH',
    },
    {
      from: 'published',
      to: 'registration_open',
      guard: 'registration_deadline_set',
      actors: ['admin', 'truong'],
      event: 'event.registration_opened',
      auditAction: 'EVENT_OPEN_REG',
    },
    {
      from: 'registration_open',
      to: 'registration_closed',
      guard: 'deadline_reached || max_participants_reached',
      actors: ['admin', 'truong', 'system'],
      event: 'event.registration_closed',
      auditAction: 'EVENT_CLOSE_REG',
    },
    {
      from: 'registration_closed',
      to: 'in_progress',
      guard: 'start_date_reached',
      actors: ['admin', 'truong', 'system'],
      event: 'event.started',
      auditAction: 'EVENT_START',
    },
    {
      from: 'in_progress',
      to: 'completed',
      guard: 'end_date_reached || manual_end',
      actors: ['admin', 'truong'],
      event: 'event.completed',
      auditAction: 'EVENT_COMPLETE',
      sideEffects: ['award_event_exp', 'generate_attendance_report'],
    },
    {
      from: 'completed',
      to: 'post_review',
      guard: 'post_event_report_submitted',
      actors: ['admin', 'truong'],
      event: 'event.reviewed',
      auditAction: 'EVENT_REVIEW',
    },
    {
      from: 'planning',
      to: 'cancelled',
      actors: ['admin'],
      event: 'event.cancelled',
      auditAction: 'EVENT_CANCEL',
    },
    {
      from: 'published',
      to: 'cancelled',
      guard: 'cancellation_reason_provided',
      actors: ['admin'],
      event: 'event.cancelled',
      auditAction: 'EVENT_CANCEL',
      sideEffects: ['notify_registered_participants'],
    },
    {
      from: 'registration_open',
      to: 'cancelled',
      guard: 'cancellation_reason_provided',
      actors: ['admin'],
      event: 'event.cancelled',
      auditAction: 'EVENT_CANCEL',
      sideEffects: ['notify_registered_participants', 'refund_if_applicable'],
    },
  ],
};
