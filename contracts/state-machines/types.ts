/**
 * TTNDD_OPS — Canonical State Machine Registry
 *
 * STORY-009 / T-0901: Foundation types for all state machines.
 * Every lifecycle in the system MUST be defined here with:
 *   - Exhaustive state enum
 *   - Typed transitions (from → to, guard, actors, events)
 *   - DB column mapping
 *   - OpenAPI enum name
 *
 * @see TTNDD_OPS_V3.md §PHẦN IX
 */

// ────────────────────────────────────────────────────────────
// Foundation Types
// ────────────────────────────────────────────────────────────

/** Actor roles that can trigger transitions */
export type Actor =
  | 'system'
  | 'admin'
  | 'truong'       // Trưởng (leader)
  | 'member'
  | 'guardian'      // Phụ huynh
  | 'qa_release';

/** A single allowed transition */
export interface TransitionDef<S extends string = string> {
  from: S;
  to: S;
  guard?: string;          // human-readable guard condition
  actors: Actor[];         // who can trigger this
  event: string;           // domain event emitted on success
  auditAction: string;     // AuditLog.action value
  sideEffects?: string[];  // optional downstream effects
}

/** Full state machine definition */
export interface StateMachineDef<S extends string = string> {
  /** Unique machine identifier, e.g. 'member_lifecycle' */
  id: string;
  /** Human-readable name */
  name: string;
  /** Owning module (M1–M10) */
  module: string;
  /** Prisma model name */
  prismaModel: string;
  /** Column that stores the status */
  dbColumn: string;
  /** DB table name (snake_case) */
  dbTable: string;
  /** OpenAPI enum tag (for codegen) */
  openApiEnum: string;
  /** All possible states */
  states: readonly S[];
  /** Initial state (must be in states) */
  initialState: S;
  /** Terminal states (no outgoing transitions) */
  terminalStates: readonly S[];
  /** Legal transitions */
  transitions: TransitionDef<S>[];
}

/**
 * Type-safe helper: validates that a transition is legal.
 * Used by services at runtime and by test harness.
 */
export function isLegalTransition<S extends string>(
  machine: StateMachineDef<S>,
  from: S,
  to: S,
): boolean {
  return machine.transitions.some((t) => t.from === from && t.to === to);
}

/**
 * Returns all legal next states from a given state.
 */
export function getNextStates<S extends string>(
  machine: StateMachineDef<S>,
  from: S,
): S[] {
  return machine.transitions
    .filter((t) => t.from === from)
    .map((t) => t.to);
}

/**
 * Returns transitions allowed for a specific actor from a state.
 */
export function getActorTransitions<S extends string>(
  machine: StateMachineDef<S>,
  from: S,
  actor: Actor,
): TransitionDef<S>[] {
  return machine.transitions.filter(
    (t) => t.from === from && t.actors.includes(actor),
  );
}
