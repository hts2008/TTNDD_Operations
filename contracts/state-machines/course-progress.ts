/**
 * Course Progress State Machine
 *
 * STORY-009 / T-0901 — MemberCourseProgress.status
 * Module: M7 LMS
 *
 * DB: member_course_progress.status (varchar 50, default 'not_started')
 */
import { StateMachineDef } from './types';

export const CourseProgressStatus = [
  'not_started',
  'enrolled',
  'in_progress',
  'completed',
  'failed',
  'dropped',
] as const;
export type CourseProgressStatus = (typeof CourseProgressStatus)[number];

export const courseProgressLifecycle: StateMachineDef<CourseProgressStatus> = {
  id: 'course_progress',
  name: 'Course Progress Lifecycle',
  module: 'M7-LMS',
  prismaModel: 'MemberCourseProgress',
  dbColumn: 'status',
  dbTable: 'member_course_progress',
  openApiEnum: 'CourseProgressStatus',
  states: CourseProgressStatus,
  initialState: 'not_started',
  terminalStates: ['completed', 'failed'],
  transitions: [
    {
      from: 'not_started',
      to: 'enrolled',
      guard: 'course_is_active && member_eligible',
      actors: ['member', 'truong', 'admin'],
      event: 'course.enrolled',
      auditAction: 'COURSE_ENROLL',
    },
    {
      from: 'enrolled',
      to: 'in_progress',
      guard: 'first_lesson_accessed',
      actors: ['member', 'system'],
      event: 'course.started',
      auditAction: 'COURSE_START',
    },
    {
      from: 'in_progress',
      to: 'completed',
      guard: 'all_required_lessons_done && quiz_passed',
      actors: ['system'],
      event: 'course.completed',
      auditAction: 'COURSE_COMPLETE',
      sideEffects: ['award_course_exp', 'issue_certificate'],
    },
    {
      from: 'in_progress',
      to: 'failed',
      guard: 'max_retries_exceeded || deadline_passed',
      actors: ['system'],
      event: 'course.failed',
      auditAction: 'COURSE_FAIL',
    },
    {
      from: 'enrolled',
      to: 'dropped',
      actors: ['member', 'admin'],
      event: 'course.dropped',
      auditAction: 'COURSE_DROP',
    },
    {
      from: 'in_progress',
      to: 'dropped',
      actors: ['member', 'admin'],
      event: 'course.dropped',
      auditAction: 'COURSE_DROP',
    },
  ],
};
