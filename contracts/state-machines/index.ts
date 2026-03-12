/**
 * TTNDD_OPS — Canonical State Machine Registry
 * Re-exports all state machines for convenient import.
 *
 * Usage:
 *   import { memberLifecycle, isLegalTransition } from '@contracts/state-machines';
 */

// Foundation types & helpers
export {
  type Actor,
  type TransitionDef,
  type StateMachineDef,
  isLegalTransition,
  getNextStates,
  getActorTransitions,
} from './types';

// Individual state machines
export { memberLifecycle, MemberStatus } from './member-lifecycle';
export { sessionLifecycle, SessionStatus } from './session-lifecycle';
export { eventLifecycle, EventStatus } from './event-lifecycle';
export { skillProgressLifecycle, SkillProgressStatus } from './skill-progress';
export { courseProgressLifecycle, CourseProgressStatus } from './course-progress';
export { rankProgressionLifecycle, RankStatus } from './rank-progression';
export { rewardRedemptionLifecycle, RedemptionStatus } from './reward-redemption';
export { quizBattleLifecycle, QuizBattleStatus } from './quiz-battle';
export { programVersionLifecycle, ProgramVersionStatus } from './program-version';

// All machines in one array for iteration
import { memberLifecycle } from './member-lifecycle';
import { sessionLifecycle } from './session-lifecycle';
import { eventLifecycle } from './event-lifecycle';
import { skillProgressLifecycle } from './skill-progress';
import { courseProgressLifecycle } from './course-progress';
import { rankProgressionLifecycle } from './rank-progression';
import { rewardRedemptionLifecycle } from './reward-redemption';
import { quizBattleLifecycle } from './quiz-battle';
import { programVersionLifecycle } from './program-version';
import { StateMachineDef } from './types';

export const ALL_STATE_MACHINES: StateMachineDef[] = [
  memberLifecycle,
  sessionLifecycle,
  eventLifecycle,
  skillProgressLifecycle,
  courseProgressLifecycle,
  rankProgressionLifecycle,
  rewardRedemptionLifecycle,
  quizBattleLifecycle,
  programVersionLifecycle,
];
