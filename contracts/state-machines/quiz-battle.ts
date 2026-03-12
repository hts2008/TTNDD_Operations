/**
 * Quiz Battle State Machine
 *
 * STORY-009 / T-0901 — QuizBattle.status
 * Module: M7 LMS (Gamification)
 *
 * DB: quiz_battles.status (varchar 50, default 'waiting')
 */
import { StateMachineDef } from './types';

export const QuizBattleStatus = [
  'waiting',
  'in_progress',
  'finished',
  'cancelled',
] as const;
export type QuizBattleStatus = (typeof QuizBattleStatus)[number];

export const quizBattleLifecycle: StateMachineDef<QuizBattleStatus> = {
  id: 'quiz_battle',
  name: 'Quiz Battle Lifecycle',
  module: 'M7-LMS',
  prismaModel: 'QuizBattle',
  dbColumn: 'status',
  dbTable: 'quiz_battles',
  openApiEnum: 'QuizBattleStatus',
  states: QuizBattleStatus,
  initialState: 'waiting',
  terminalStates: ['finished', 'cancelled'],
  transitions: [
    {
      from: 'waiting',
      to: 'in_progress',
      guard: 'host_starts_battle',
      actors: ['truong', 'admin'],
      event: 'quiz_battle.started',
      auditAction: 'QUIZ_BATTLE_START',
    },
    {
      from: 'in_progress',
      to: 'finished',
      guard: 'all_questions_answered || time_expired',
      actors: ['system', 'truong'],
      event: 'quiz_battle.finished',
      auditAction: 'QUIZ_BATTLE_FINISH',
      sideEffects: ['calculate_rankings', 'award_battle_exp'],
    },
    {
      from: 'waiting',
      to: 'cancelled',
      actors: ['truong', 'admin'],
      event: 'quiz_battle.cancelled',
      auditAction: 'QUIZ_BATTLE_CANCEL',
    },
    {
      from: 'in_progress',
      to: 'cancelled',
      guard: 'host_aborts',
      actors: ['truong', 'admin'],
      event: 'quiz_battle.cancelled',
      auditAction: 'QUIZ_BATTLE_CANCEL',
    },
  ],
};
