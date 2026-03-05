export const SPICES = {
  S: { code: 'S', name: 'Social', nameVi: 'Xã hội' },
  P: { code: 'P', name: 'Physical', nameVi: 'Thể chất' },
  I: { code: 'I', name: 'Intellectual', nameVi: 'Trí tuệ' },
  C: { code: 'C', name: 'Character', nameVi: 'Nhân cách' },
  E: { code: 'E', name: 'Emotional', nameVi: 'Cảm xúc' },
  SP: { code: 'SP', name: 'Spiritual', nameVi: 'Tâm linh' },
} as const;

export type SpicesCode = keyof typeof SPICES;
