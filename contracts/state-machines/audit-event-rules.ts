/**
 * T-0905: Audit + Event Emission Rules
 *
 * Canonical mapping of transitions → AuditLog entries + DomainEvents.
 * Services MUST use these rules when performing state transitions.
 *
 * Usage:
 *   import { getAuditRule } from '@contracts/state-machines/audit-event-rules';
 *   const rule = getAuditRule('member_lifecycle', 'pending', 'active');
 *   // → { auditAction: 'MEMBER_ACTIVATE', event: 'member.activated', ... }
 */

import { ALL_STATE_MACHINES, StateMachineDef, TransitionDef } from './index';

// ── Types ──

export interface AuditEventRule {
  machineId: string;
  from: string;
  to: string;
  /** AuditLog.action column value */
  auditAction: string;
  /** AuditLog.resource column value (= prismaModel) */
  auditResource: string;
  /** Domain event name to emit */
  domainEvent: string;
  /** Optional side effects to trigger */
  sideEffects: string[];
}

// ── Rule Generation ──

/**
 * Generate all audit-event rules from registered state machines.
 */
export function generateAllRules(): AuditEventRule[] {
  const rules: AuditEventRule[] = [];

  for (const sm of ALL_STATE_MACHINES) {
    for (const t of sm.transitions) {
      rules.push({
        machineId: sm.id,
        from: t.from,
        to: t.to,
        auditAction: t.auditAction,
        auditResource: sm.prismaModel,
        domainEvent: t.event,
        sideEffects: t.sideEffects ?? [],
      });
    }
  }

  return rules;
}

/**
 * Get the audit rule for a specific transition.
 */
export function getAuditRule(
  machineId: string,
  from: string,
  to: string,
): AuditEventRule | undefined {
  const sm = ALL_STATE_MACHINES.find((m) => m.id === machineId);
  if (!sm) return undefined;

  const transition = sm.transitions.find(
    (t: TransitionDef) => t.from === from && t.to === to,
  );
  if (!transition) return undefined;

  return {
    machineId: sm.id,
    from,
    to,
    auditAction: transition.auditAction,
    auditResource: sm.prismaModel,
    domainEvent: transition.event,
    sideEffects: transition.sideEffects ?? [],
  };
}

/**
 * Get all audit actions for a given machine (for OpenAPI documentation).
 */
export function getAuditActions(machineId: string): string[] {
  const sm = ALL_STATE_MACHINES.find((m) => m.id === machineId);
  if (!sm) return [];
  return [...new Set(sm.transitions.map((t: TransitionDef) => t.auditAction))];
}

/**
 * Get all domain events for a given machine (for event catalog).
 */
export function getDomainEvents(machineId: string): string[] {
  const sm = ALL_STATE_MACHINES.find((m) => m.id === machineId);
  if (!sm) return [];
  return [...new Set(sm.transitions.map((t: TransitionDef) => t.event))];
}

// ── Static Export ──

export const ALL_AUDIT_EVENT_RULES = generateAllRules();
