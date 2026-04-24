import { Injectable, BadRequestException } from '@nestjs/common';

/**
 * SM-1: Member Lifecycle State Machine
 *
 * States: pending → active → inactive | suspended | transferred | left
 *
 * Transitions:
 *   pending → active    (approve)
 *   pending → rejected  (reject)
 *   active  → inactive  (voluntary_pause)
 *   inactive → active   (resume)
 *   active  → suspended (discipline)
 *   suspended → active  (reinstate)
 *   active  → transferred (branch_transition)
 *   transferred → active (accept_in_new_branch)
 *   active  → left      (offboarding)
 */

const TRANSITIONS: Record<string, Record<string, string>> = {
  pending: {
    approve: 'active',
    reject: 'rejected',
  },
  active: {
    voluntary_pause: 'inactive',
    discipline: 'suspended',
    branch_transition: 'transferred',
    offboarding: 'left',
  },
  inactive: {
    resume: 'active',
  },
  suspended: {
    reinstate: 'active',
  },
  transferred: {
    accept_in_new_branch: 'active',
  },
};

/**
 * T-1003: Transition guard conditions.
 * Maps action → guard function name for pre-transition checks.
 */
interface TransitionGuardContext {
  hasCompleteProfile: boolean;
  hasGuardianIfRequired: boolean;
  hasPendingFees: boolean;
  complianceViolations: string[];
}

const TRANSITION_GUARDS: Record<string, (ctx: TransitionGuardContext) => string | null> = {
  approve: (ctx) => {
    if (!ctx.hasCompleteProfile)
      return 'Cannot approve: member profile incomplete (missing fullName or birthDate)';
    if (!ctx.hasGuardianIfRequired)
      return 'Cannot approve: under-18 member requires at least one guardian';
    return null;
  },
  offboarding: (ctx) => {
    if (ctx.hasPendingFees) return 'Cannot offboard: member has pending/overdue fees';
    return null;
  },
  reinstate: (ctx) => {
    if (ctx.complianceViolations.length > 0)
      return `Cannot reinstate: unresolved compliance issues — ${ctx.complianceViolations.join(', ')}`;
    return null;
  },
};

@Injectable()
export class MemberLifecycleService {
  /**
   * Execute a state transition with optional guard checks.
   * T-1003: Guards enforce business rules before allowing transitions.
   */
  transition(currentStatus: string, action: string, guardContext?: TransitionGuardContext): string {
    const allowed = TRANSITIONS[currentStatus];
    if (!allowed) {
      throw new BadRequestException(`No transitions available from status '${currentStatus}'`);
    }
    const nextStatus = allowed[action];
    if (!nextStatus) {
      throw new BadRequestException(
        `Action '${action}' is not allowed from status '${currentStatus}'. Allowed: ${Object.keys(allowed).join(', ')}`,
      );
    }

    // T-1003: Run guard if one exists for this action
    if (guardContext) {
      const guard = TRANSITION_GUARDS[action];
      if (guard) {
        const violation = guard(guardContext);
        if (violation) {
          throw new BadRequestException(violation);
        }
      }
    }

    return nextStatus;
  }

  getAllowedActions(currentStatus: string): string[] {
    return Object.keys(TRANSITIONS[currentStatus] || {});
  }

  /**
   * T-1003: Check if a specific transition is valid without executing it.
   */
  canTransition(currentStatus: string, action: string): boolean {
    const allowed = TRANSITIONS[currentStatus];
    return !!allowed && !!allowed[action];
  }

  /**
   * Get the full state machine definition (for documentation/UI).
   */
  getStateMachine(): Record<string, Record<string, string>> {
    return { ...TRANSITIONS };
  }
}
