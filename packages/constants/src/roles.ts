export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

export const TRUONG_LEVELS = {
  TAP_SINH: 'tap_sinh',
  TRUONG_CHINH_THUC: 'truong_chinh_thuc',
  HLV: 'hlv',
  ALT: 'alt',
} as const;

export const BRANCHES = {
  DONG: { code: 'dong', name: 'Ngành Đồng', minAge: 6, maxAge: 11 },
  THIEU: { code: 'thieu', name: 'Ngành Thiếu', minAge: 12, maxAge: 17 },
  THANH: { code: 'thanh', name: 'Ngành Thanh', minAge: 18, maxAge: 25 },
} as const;
