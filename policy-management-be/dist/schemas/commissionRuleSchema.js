"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionRuleSearchSchema = exports.commissionRuleBulkUpsertSchema = exports.commissionRuleUpdateSchema = exports.commissionRuleSchema = exports.ProductCategoryEnum = exports.AgeConditionEnum = exports.DeductibleTypeEnum = exports.PolicyCreationStatusEnum = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.PolicyCreationStatusEnum = zod_1.z.nativeEnum(client_1.PolicyCreationStatus);
exports.DeductibleTypeEnum = zod_1.z.nativeEnum(client_1.DeductibleType);
exports.AgeConditionEnum = zod_1.z.nativeEnum(client_1.AgeCondition);
exports.ProductCategoryEnum = zod_1.z.nativeEnum(client_1.ProductCategory);
exports.commissionRuleSchema = zod_1.z.object({
    productCategory: exports.ProductCategoryEnum,
    policy_name_id: zod_1.z.string().uuid().optional().nullable(),
    policyStatus: exports.PolicyCreationStatusEnum,
    deductibleType: exports.DeductibleTypeEnum,
    ageCondition: exports.AgeConditionEnum,
    commissionPercent: zod_1.z.number().min(0, 'Commission percent must be non-negative'),
    is_active: zod_1.z.boolean().default(true),
});
exports.commissionRuleUpdateSchema = exports.commissionRuleSchema.partial();
exports.commissionRuleBulkUpsertSchema = zod_1.z.object({
    rules: zod_1.z.array(zod_1.z.object({
        productCategory: exports.ProductCategoryEnum,
        policyStatus: exports.PolicyCreationStatusEnum,
        deductibleType: exports.DeductibleTypeEnum,
        commissionPercent: zod_1.z.number().min(0),
        is_active: zod_1.z.boolean().optional().default(true),
    })),
});
exports.commissionRuleSearchSchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    productCategory: zod_1.z.string().optional(),
    policyStatus: zod_1.z.string().optional(),
    deductibleType: zod_1.z.string().optional(),
    ageCondition: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().optional().default(1),
    limit: zod_1.z.coerce.number().int().positive().optional().default(100),
});
