import { z } from 'zod';
import { PolicyCreationStatus, DeductibleType, AgeCondition, ProductCategory } from '@prisma/client';

export const PolicyCreationStatusEnum = z.nativeEnum(PolicyCreationStatus);
export const DeductibleTypeEnum = z.nativeEnum(DeductibleType);
export const AgeConditionEnum = z.nativeEnum(AgeCondition);
export const ProductCategoryEnum = z.nativeEnum(ProductCategory);

export const commissionRuleSchema = z.object({
  productCategory: ProductCategoryEnum,
  policy_name_id: z.string().uuid().optional().nullable(),
  policyStatus: PolicyCreationStatusEnum,
  deductibleType: DeductibleTypeEnum,
  ageCondition: AgeConditionEnum,
  commissionPercent: z.number().min(0, 'Commission percent must be non-negative'),
  is_active: z.boolean().default(true),
});

export const commissionRuleUpdateSchema = commissionRuleSchema.partial();

export const commissionRuleBulkUpsertSchema = z.object({
  rules: z.array(
    z.object({
      productCategory: ProductCategoryEnum,
      policyStatus: PolicyCreationStatusEnum,
      deductibleType: DeductibleTypeEnum,
      commissionPercent: z.number().min(0),
      is_active: z.boolean().optional().default(true),
    })
  ),
});

export const commissionRuleSearchSchema = z.object({
  search: z.string().optional(),
  productCategory: z.string().optional(),
  policyStatus: z.string().optional(),
  deductibleType: z.string().optional(),
  ageCondition: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().optional().default(100),
});
