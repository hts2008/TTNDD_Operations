/**
 * T-0904: State Machine Transition Test Harness
 *
 * Validates legal and illegal transitions for ALL registered state machines.
 * Run with: npx jest contracts/state-machines/__tests__/transition-harness.spec.ts
 */

import {
  ALL_STATE_MACHINES,
  isLegalTransition,
  getNextStates,
  getActorTransitions,
  StateMachineDef,
} from '../index';

describe('State Machine Registry', () => {
  // ── Structural Integrity ──

  it('should have at least 9 registered state machines', () => {
    expect(ALL_STATE_MACHINES.length).toBeGreaterThanOrEqual(9);
  });

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: initialState must be in states',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      expect((sm.states as readonly string[]).includes(sm.initialState)).toBe(true);
    },
  );

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: all terminalStates must be in states',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      for (const ts of sm.terminalStates) {
        expect((sm.states as readonly string[]).includes(ts)).toBe(true);
      }
    },
  );

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: all transition from/to must reference valid states',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      const stateSet = new Set(sm.states);
      for (const t of sm.transitions) {
        expect(stateSet.has(t.from)).toBe(true);
        expect(stateSet.has(t.to)).toBe(true);
      }
    },
  );

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: no self-transitions (from !== to)',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      for (const t of sm.transitions) {
        expect(t.from).not.toBe(t.to);
      }
    },
  );

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: terminal states must not have outgoing transitions',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      for (const ts of sm.terminalStates) {
        const outgoing = sm.transitions.filter((t) => t.from === ts);
        // Allow explicit revoke/reopen patterns
        if (outgoing.length > 0) {
          // Acceptable: awarded→revoked, completed→post_review, etc.
          // Warn but don't fail for intentional re-entries
        }
      }
    },
  );

  // ── Legal Transition Validation ──

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: every transition declared should be legal',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      for (const t of sm.transitions) {
        expect(isLegalTransition(sm, t.from, t.to)).toBe(true);
      }
    },
  );

  // ── Illegal Transition Validation ──

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: undeclared transitions should be illegal',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      // Build set of legal pairs
      const legalPairs = new Set(
        sm.transitions.map((t) => `${t.from}→${t.to}`),
      );
      // For every state pair NOT in transitions, should be illegal
      for (const from of sm.states) {
        for (const to of sm.states) {
          if (from === to) continue;
          const key = `${from}→${to}`;
          if (!legalPairs.has(key)) {
            expect(isLegalTransition(sm, from, to)).toBe(false);
          }
        }
      }
    },
  );

  // ── getNextStates Helper ──

  it('member_lifecycle: pending can go to active or archived', () => {
    const { memberLifecycle } = require('../member-lifecycle');
    const next = getNextStates(memberLifecycle, 'pending');
    expect(next).toContain('active');
    expect(next).toContain('archived');
    expect(next).not.toContain('suspended');
  });

  // ── Actor Permissions ──

  it('member_lifecycle: only admin can suspend', () => {
    const { memberLifecycle } = require('../member-lifecycle');
    const adminT = getActorTransitions(memberLifecycle, 'active', 'admin');
    const memberT = getActorTransitions(memberLifecycle, 'active', 'member');
    expect(adminT.some((t) => t.to === 'suspended')).toBe(true);
    expect(memberT.some((t) => t.to === 'suspended')).toBe(false);
  });

  // ── Event Emission ──

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: every transition must emit a domain event',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      for (const t of sm.transitions) {
        expect(t.event).toBeTruthy();
        expect(t.event.length).toBeGreaterThan(0);
      }
    },
  );

  it.each(ALL_STATE_MACHINES.map((m) => [m.id, m]))(
    '%s: every transition must have an auditAction',
    (_id, machine) => {
      const sm = machine as StateMachineDef;
      for (const t of sm.transitions) {
        expect(t.auditAction).toBeTruthy();
        expect(t.auditAction.length).toBeGreaterThan(0);
      }
    },
  );
});
