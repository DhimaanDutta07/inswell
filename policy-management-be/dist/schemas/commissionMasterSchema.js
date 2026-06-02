"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionMasterQuerySchema = exports.commissionMasterStatusSchema = exports.commissionMasterUpdateSchema = exports.commissionMasterSchema = void 0;
const zod_1 = require("zod");
exports.commissionMasterSchema = zod_1.z.object({
    category: zod_1.z.string().trim().min(1, 'category is required'),
    sub_category: zod_1.z.string().trim().min(1, 'sub_category is required'),
    commission_percentage: zod_1.z.coerce
        .number()
        .min(0, 'commission_percentage must be non-negative')
        .max(999.99, 'commission_percentage is out of range'),
    is_active: zod_1.z.boolean().default(true),
});
exports.commissionMasterUpdateSchema = exports.commissionMasterSchema.partial();
exports.commissionMasterStatusSchema = zod_1.z.object({
    is_active: zod_1.z.boolean(),
});
exports.commissionMasterQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
    isActive: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true')),
});
