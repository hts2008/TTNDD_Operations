/**
 * T-0145: Feature flags for heavy project views
 * Controls which advanced features are enabled per organization
 */

export interface ProjectFeatureFlags {
  /** Enable Gantt / timeline view (GET /:id/gantt) */
  ganttEnabled: boolean;
  /** Enable task dependency management */
  dependenciesEnabled: boolean;
  /** Enable wiki / project documents */
  wikiEnabled: boolean;
  /** Enable time tracking */
  timeTrackingEnabled: boolean;
  /** Enable cost tracking */
  costTrackingEnabled: boolean;
  /** Enable plan revision history */
  revisionHistoryEnabled: boolean;
}

/**
 * Default flags — all enabled for MVP.
 * In production, these could be loaded from org settings or a feature-flag service.
 */
export const DEFAULT_PROJECT_FLAGS: ProjectFeatureFlags = {
  ganttEnabled: true,
  dependenciesEnabled: true,
  wikiEnabled: true,
  timeTrackingEnabled: true,
  costTrackingEnabled: true,
  revisionHistoryEnabled: true,
};

/**
 * Quick helper to check a flag. Usage in controllers:
 *   if (!getFlag(flags, 'ganttEnabled')) throw new ForbiddenException('Feature disabled');
 */
export function getFlag(flags: Partial<ProjectFeatureFlags>, key: keyof ProjectFeatureFlags): boolean {
  return flags[key] ?? DEFAULT_PROJECT_FLAGS[key];
}
