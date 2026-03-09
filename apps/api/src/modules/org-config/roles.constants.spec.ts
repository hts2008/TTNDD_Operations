import {
  OrgRole,
  ROLE_HIERARCHY,
  hasMinimumRole,
  isHigherRole,
  hasPermission,
  Permission,
  ROLE_PERMISSIONS,
} from './roles.constants';

describe('roles.constants', () => {
  // ── ROLE_HIERARCHY ──────────────────────────────────────

  describe('ROLE_HIERARCHY', () => {
    it('should have 5 roles in ascending order', () => {
      expect(ROLE_HIERARCHY).toHaveLength(5);
      expect(ROLE_HIERARCHY[0]).toBe(OrgRole.MEMBER);
      expect(ROLE_HIERARCHY[4]).toBe(OrgRole.SUPER_ADMIN);
    });
  });

  // ── hasMinimumRole ──────────────────────────────────────

  describe('hasMinimumRole', () => {
    it('super_admin >= any role', () => {
      expect(hasMinimumRole('super_admin', OrgRole.MEMBER)).toBe(true);
      expect(hasMinimumRole('super_admin', OrgRole.SUPER_ADMIN)).toBe(true);
    });

    it('member >= member', () => {
      expect(hasMinimumRole('member', OrgRole.MEMBER)).toBe(true);
    });

    it('member < leader', () => {
      expect(hasMinimumRole('member', OrgRole.LEADER)).toBe(false);
    });

    it('invalid role returns false', () => {
      expect(hasMinimumRole('invalid_role', OrgRole.MEMBER)).toBe(false);
    });
  });

  // ── isHigherRole ────────────────────────────────────────

  describe('isHigherRole', () => {
    it('admin > member', () => {
      expect(isHigherRole('admin', 'member')).toBe(true);
    });

    it('admin > sub_leader', () => {
      expect(isHigherRole('admin', 'sub_leader')).toBe(true);
    });

    it('admin NOT > admin (same level)', () => {
      expect(isHigherRole('admin', 'admin')).toBe(false);
    });

    it('member NOT > leader', () => {
      expect(isHigherRole('member', 'leader')).toBe(false);
    });

    it('invalid role returns false', () => {
      expect(isHigherRole('unknown', 'member')).toBe(false);
      expect(isHigherRole('admin', 'unknown')).toBe(false);
    });
  });

  // ── hasPermission ───────────────────────────────────────

  describe('hasPermission', () => {
    it('super_admin has all permissions', () => {
      expect(hasPermission('super_admin', Permission.ORG_CREATE)).toBe(true);
      expect(hasPermission('super_admin', Permission.AUDIT_VIEW)).toBe(true);
      expect(hasPermission('super_admin', Permission.MODULE_TOGGLE)).toBe(true);
    });

    it('admin does not have ORG_CREATE', () => {
      expect(hasPermission('admin', Permission.ORG_CREATE)).toBe(false);
    });

    it('admin has MEMBER_INVITE', () => {
      expect(hasPermission('admin', Permission.MEMBER_INVITE)).toBe(true);
    });

    it('leader has limited permissions', () => {
      expect(hasPermission('leader', Permission.MEMBER_INVITE)).toBe(true);
      expect(hasPermission('leader', Permission.BRANCH_DELETE)).toBe(false);
    });

    it('member has no permissions', () => {
      expect(hasPermission('member', Permission.MEMBER_VIEW_LIST)).toBe(false);
    });

    it('invalid role returns false', () => {
      expect(hasPermission('invalid', Permission.ORG_CREATE)).toBe(false);
    });
  });

  // ── ROLE_PERMISSIONS ────────────────────────────────────

  describe('ROLE_PERMISSIONS', () => {
    it('super_admin has same count as total permissions', () => {
      const totalPerms = Object.values(Permission).length;
      expect(ROLE_PERMISSIONS[OrgRole.SUPER_ADMIN]).toHaveLength(totalPerms);
    });

    it('sub_leader only has MEMBER_VIEW_LIST', () => {
      expect(ROLE_PERMISSIONS[OrgRole.SUB_LEADER]).toEqual([Permission.MEMBER_VIEW_LIST]);
    });

    it('member has empty permissions array', () => {
      expect(ROLE_PERMISSIONS[OrgRole.MEMBER]).toEqual([]);
    });
  });
});
