/**
 * T-0023: Role hierarchy, permissions, and scoping constants
 * for TTNDD_Ops IAM system.
 *
 * Role hierarchy (highest → lowest):
 *   super_admin > admin > leader > sub_leader > member
 */

// ── Role Enum ──────────────────────────────────────────────

export const OrgRole = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  LEADER: 'leader',
  SUB_LEADER: 'sub_leader',
  MEMBER: 'member',
} as const;

export type OrgRoleType = (typeof OrgRole)[keyof typeof OrgRole];

// ── Role Hierarchy (higher index = higher privilege) ───────

export const ROLE_HIERARCHY: OrgRoleType[] = [
  OrgRole.MEMBER,
  OrgRole.SUB_LEADER,
  OrgRole.LEADER,
  OrgRole.ADMIN,
  OrgRole.SUPER_ADMIN,
];

/**
 * Check if `actorRole` has equal or higher privilege than `requiredRole`.
 */
export function hasMinimumRole(actorRole: string, requiredRole: OrgRoleType): boolean {
  const actorIndex = ROLE_HIERARCHY.indexOf(actorRole as OrgRoleType);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  if (actorIndex === -1 || requiredIndex === -1) return false;
  return actorIndex >= requiredIndex;
}

/**
 * Check if `actorRole` is strictly higher than `targetRole`.
 * Used to prevent role escalation (e.g., admin can't make another admin into super_admin).
 */
export function isHigherRole(actorRole: string, targetRole: string): boolean {
  const actorIndex = ROLE_HIERARCHY.indexOf(actorRole as OrgRoleType);
  const targetIndex = ROLE_HIERARCHY.indexOf(targetRole as OrgRoleType);
  if (actorIndex === -1 || targetIndex === -1) return false;
  return actorIndex > targetIndex;
}

// ── Permission Definitions ─────────────────────────────────

export const Permission = {
  // Organization
  ORG_CREATE: 'org:create',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',
  ORG_VIEW_SETTINGS: 'org:view_settings',
  ORG_UPDATE_SETTINGS: 'org:update_settings',

  // Branches & Units
  BRANCH_CREATE: 'branch:create',
  BRANCH_UPDATE: 'branch:update',
  BRANCH_DELETE: 'branch:delete',
  UNIT_CREATE: 'unit:create',
  UNIT_UPDATE: 'unit:update',
  UNIT_DELETE: 'unit:delete',

  // Members / IAM
  MEMBER_INVITE: 'member:invite',
  MEMBER_UPDATE_ROLE: 'member:update_role',
  MEMBER_DEACTIVATE: 'member:deactivate',
  MEMBER_REMOVE: 'member:remove',
  MEMBER_VIEW_LIST: 'member:view_list',
  MEMBER_REASSIGN: 'member:reassign',

  // Org Chart (T-0055)
  ORG_CHART_VIEW: 'org_chart:view',
  ORG_CHART_MANAGE: 'org_chart:manage',
  ORG_CHART_ASSIGN: 'org_chart:assign',

  // Volunteer (T-0055)
  VOLUNTEER_VIEW: 'volunteer:view',
  VOLUNTEER_MANAGE: 'volunteer:manage',
  VOLUNTEER_SELF: 'volunteer:self',

  // Modules
  MODULE_TOGGLE: 'module:toggle',

  // Audit
  AUDIT_VIEW: 'audit:view',
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

// ── Role → Permissions Map ─────────────────────────────────

export const ROLE_PERMISSIONS: Record<OrgRoleType, PermissionType[]> = {
  [OrgRole.SUPER_ADMIN]: Object.values(Permission), // all permissions

  [OrgRole.ADMIN]: [
    Permission.ORG_UPDATE,
    Permission.ORG_VIEW_SETTINGS,
    Permission.ORG_UPDATE_SETTINGS,
    Permission.BRANCH_CREATE,
    Permission.BRANCH_UPDATE,
    Permission.BRANCH_DELETE,
    Permission.UNIT_CREATE,
    Permission.UNIT_UPDATE,
    Permission.UNIT_DELETE,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_UPDATE_ROLE,
    Permission.MEMBER_DEACTIVATE,
    Permission.MEMBER_REMOVE,
    Permission.MEMBER_VIEW_LIST,
    Permission.MEMBER_REASSIGN,
    Permission.ORG_CHART_VIEW,
    Permission.ORG_CHART_MANAGE,
    Permission.ORG_CHART_ASSIGN,
    Permission.VOLUNTEER_VIEW,
    Permission.VOLUNTEER_MANAGE,
    Permission.MODULE_TOGGLE,
    Permission.AUDIT_VIEW,
  ],

  [OrgRole.LEADER]: [
    Permission.UNIT_UPDATE,
    Permission.MEMBER_INVITE,
    Permission.MEMBER_VIEW_LIST,
    Permission.MEMBER_REASSIGN,
    Permission.ORG_CHART_VIEW,
    Permission.ORG_CHART_ASSIGN,
    Permission.VOLUNTEER_VIEW,
    Permission.VOLUNTEER_MANAGE,
    Permission.AUDIT_VIEW,
  ],

  [OrgRole.SUB_LEADER]: [
    Permission.MEMBER_VIEW_LIST,
    Permission.ORG_CHART_VIEW,
    Permission.VOLUNTEER_VIEW,
    Permission.VOLUNTEER_SELF,
  ],

  [OrgRole.MEMBER]: [
    Permission.VOLUNTEER_SELF,
    // Members can view own chart node & manage own availability
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: string, permission: PermissionType): boolean {
  const rolePerms = ROLE_PERMISSIONS[role as OrgRoleType];
  if (!rolePerms) return false;
  return rolePerms.includes(permission);
}
