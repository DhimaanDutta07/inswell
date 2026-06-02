import { z } from 'zod';

export const commissionMasterSchema = z.object({
  category: z.string().trim().min(1, 'category is required'),
  sub_category: z.string().trim().min(1, 'sub_category is required'),
  commission_percentage: z.coerce
    .number()
    .min(0, 'commission_percentage must be non-negative')
    .max(999.99, 'commission_percentage is out of range'),
  is_active: z.boolean().default(true),
});

export const commissionMasterUpdateSchema = commissionMasterSchema.partial();

export const commissionMasterStatusSchema = z.object({
  is_active: z.boolean(),
});

export const commissionMasterQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});
