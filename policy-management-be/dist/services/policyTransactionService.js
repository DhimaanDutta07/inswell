"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyTransactionService = exports.computeCommissionAmount = void 0;
const policyTransactionRepository_1 = require("../repositories/policyTransactionRepository");
const commissionMasterService_1 = require("./commissionMasterService");
// Commission Amount = (Premium Amount * Commission Percentage) / 100
const computeCommissionAmount = (premiumAmount, commissionPercentage) => {
    const amount = (premiumAmount * commissionPercentage) / 100;
    // Keep two decimals to match the DECIMAL(12,2) column.
    return Math.round((amount + Number.EPSILON) * 100) / 100;
};
exports.computeCommissionAmount = computeCommissionAmount;
exports.policyTransactionService = {
    getAll: (params = {}) => policyTransactionRepository_1.policyTransactionRepository.findAll(params),
    getById: (id) => policyTransactionRepository_1.policyTransactionRepository.findById(id),
    create: async (data) => {
        // Use the supplied percentage if present, otherwise pull the active master value.
        let commissionPercentage = data.commission_percentage;
        if (commissionPercentage === undefined) {
            const resolved = await commissionMasterService_1.commissionMasterService.resolvePercentage(data.category, data.sub_category);
            commissionPercentage = resolved.percentage;
        }
        const commissionAmount = (0, exports.computeCommissionAmount)(data.premium_amount, commissionPercentage);
        return policyTransactionRepository_1.policyTransactionRepository.create({
            policy_number: data.policy_number,
            customer_name: data.customer_name,
            category: data.category,
            sub_category: data.sub_category,
            premium_amount: data.premium_amount,
            commission_percentage: commissionPercentage,
            commission_amount: commissionAmount,
        });
    },
};
