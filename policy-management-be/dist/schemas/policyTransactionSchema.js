"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyTransactionQuerySchema = exports.policyTransactionSchema = void 0;
const zod_1 = require("zod");
exports.policyTransactionSchema = zod_1.z.object({
    policy_number: zod_1.z.string().trim().min(1, 'policy_number is required'),
    customer_name: zod_1.z.string().trim().min(1, 'customer_name is required'),
    category: zod_1.z.string().trim().min(1, 'category is required'),
    sub_category: zod_1.z.string().trim().min(1, 'sub_category is required'),
    premium_amount: zod_1.z.coerce.number().positive('premium_amount must be greater than 0'),
    // Optional: when omitted, the active commission_master percentage is used.
    commission_percentage: zod_1.z.coerce.number().min(0).max(999.99).optional(),
});
exports.policyTransactionQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    category: zod_1.z.string().optional(),
});
