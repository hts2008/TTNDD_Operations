import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const orgSettingsSchema = z.object({
  modules: z.record(z.boolean()).default({}),
  theme: z.enum(['dong', 'thieu', 'thanh', 'custom']).default('dong'),
  quotas: z
    .object({
      maxMembers: z.number().int().min(1).default(500),
      maxAdmins: z.number().int().min(1).default(20),
    })
    .default({}),
  safety: z
    .object({
      twoAdultRule: z.boolean().default(true),
      quietHoursStart: z.string().default('22:00'),
      quietHoursEnd: z.string().default('07:00'),
    })
    .default({}),
});

export type OrgSettings = z.infer<typeof orgSettingsSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
