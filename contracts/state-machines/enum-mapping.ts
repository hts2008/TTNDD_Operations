/**
 * T-0902: State → DB Enum → OpenAPI Enum Mapping
 *
 * This file provides a single-source-of-truth mapping between:
 * 1. State machine states (canonical definition)
 * 2. Database column values (Prisma schema reality)
 * 3. OpenAPI enum values (for codegen & external contracts)
 *
 * Since Prisma schema uses VARCHAR strings (no native enums),
 * the DB values are identical to the state machine states.
 * This mapping ensures they stay in sync.
 */

import { ALL_STATE_MACHINES, StateMachineDef } from './index';

export interface EnumMapping {
  machineId: string;
  module: string;
  prismaModel: string;
  dbTable: string;
  dbColumn: string;
  openApiEnum: string;
  /** State values: SM state === DB value === OpenAPI enum value */
  values: readonly string[];
  defaultValue: string;
}

/**
 * Auto-generate enum mappings from all registered state machines.
 * Each mapping confirms that:
 *   SM state name === DB varchar value === OpenAPI enum member
 */
export function generateEnumMappings(): EnumMapping[] {
  return ALL_STATE_MACHINES.map((sm: StateMachineDef) => ({
    machineId: sm.id,
    module: sm.module,
    prismaModel: sm.prismaModel,
    dbTable: sm.dbTable,
    dbColumn: sm.dbColumn,
    openApiEnum: sm.openApiEnum,
    values: sm.states,
    defaultValue: sm.initialState,
  }));
}

/**
 * Validate that a given DB value is a legal state for a machine.
 */
export function isValidDbValue(machineId: string, value: string): boolean {
  const machine = ALL_STATE_MACHINES.find((m) => m.id === machineId);
  if (!machine) return false;
  return (machine.states as readonly string[]).includes(value);
}

// ── Static Mapping Table (for docs & OpenAPI codegen) ──

export const ENUM_MAPPING_TABLE = generateEnumMappings();

/*
 * Summary table (use in docs or CI validation):
 *
 * | Machine ID         | DB Table                 | Column | OpenAPI Enum          | Values                                                          |
 * |--------------------|--------------------------|--------|-----------------------|-----------------------------------------------------------------|
 * | member_lifecycle   | org_members              | status | MemberStatus          | pending, active, inactive, suspended, archived                  |
 * | session_lifecycle  | sessions                 | status | SessionStatus         | draft, planned, in_progress, completed, cancelled               |
 * | event_lifecycle    | events                   | status | EventStatus           | planning, published, registration_open, ..., cancelled          |
 * | skill_progress     | member_skill_progress    | status | SkillProgressStatus   | not_started, in_progress, submitted, verified, mastered, rejected|
 * | course_progress    | member_course_progress   | status | CourseProgressStatus   | not_started, enrolled, in_progress, completed, failed, dropped  |
 * | rank_progression   | member_ranks             | status | RankStatus            | not_started, in_progress, requirements_met, verified, awarded   |
 * | reward_redemption  | reward_redemptions       | status | RedemptionStatus      | pending, approved, fulfilled, rejected, cancelled               |
 * | quiz_battle        | quiz_battles             | status | QuizBattleStatus      | waiting, in_progress, finished, cancelled                       |
 * | program_version    | program_versions         | status | ProgramVersionStatus  | draft, review, active, archived                                 |
 */
