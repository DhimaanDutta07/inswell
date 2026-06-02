import { z } from 'zod';

export const policyTransactionSchema = z.object({
  policy_number: z.string().trim().min(1, 'policy_number is required'),
  customer_name: z.string().trim().min(1, 'customer_name is required'),
  category: z.string().trim().min(1, 'category is required'),
  sub_category: z.string().trim().min(1, 'sub_category is required'),
  premium_amount: z.coerce.number().positive('premium_amount must be greater than 0'),
  // Optional: when omitted, the active commission_master percentage is used.
  commission_percentage: z.coerce.number().min(0).max(999.99).optional(),
});

export const policyTransactionQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
});
