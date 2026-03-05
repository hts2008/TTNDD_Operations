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

@Injectable()
export class MemberLifecycleService {
  transition(currentStatus: string, action: string): string {
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
    return nextStatus;
  }

  getAllowedActions(currentStatus: string): string[] {
    return Object.keys(TRANSITIONS[currentStatus] || {});
  }
}
