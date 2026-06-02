"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionRuleService = void 0;
const client_1 = require("@prisma/client");
const commissionRuleRepository_1 = require("../repositories/commissionRuleRepository");
const AppError_1 = require("../utils/AppError");
const commissionUtils_1 = require("../utils/commissionUtils");
exports.commissionRuleService = {
    async createCommissionRule(data) {
        const existing = await commissionRuleRepository_1.commissionRuleRepository.findAll();
        const isDuplicate = existing.some((rule) => rule.productCategory === data.productCategory &&
            rule.policyStatus === data.policyStatus &&
            rule.deductibleType === data.deductibleType &&
            rule.ageCondition === data.ageCondition);
        if (isDuplicate) {
            throw new Error('A commission rule with the same conditions already exists.');
        }
        return commissionRuleRepository_1.commissionRuleRepository.create(data);
    },
    async bulkUpsertCommissionRules(rules) {
        const results = [];
        for (const leaf of rules) {
            for (const ageCondition of [client_1.AgeCondition.LESS_THAN_60, client_1.AgeCondition.GREATER_THAN_60]) {
                const saved = await commissionRuleRepository_1.commissionRuleRepository.upsertByKey({
                    productCategory: leaf.productCategory,
                    policyStatus: leaf.policyStatus,
                    deductibleType: leaf.deductibleType,
                    ageCondition,
                    commissionPercent: leaf.commissionPercent,
                    is_active: leaf.is_active ?? true,
                });
                results.push(saved);
            }
        }
        return results;
    },
    async getRulesByProductCategory(productCategory) {
        return commissionRuleRepository_1.commissionRuleRepository.findByProductCategory(productCategory);
    },
    getCommissionMatrixTemplate() {
        return commissionUtils_1.COMMISSION_RULE_LEAVES;
    },
    async getAllCommissionRules() {
        return commissionRuleRepository_1.commissionRuleRepository.findAll();
    },
    async getCommissionRuleById(id) {
        return commissionRuleRepository_1.commissionRuleRepository.findById(id);
    },
    async updateCommissionRule(id, data) {
        return commissionRuleRepository_1.commissionRuleRepository.update(id, data);
    },
    async deleteCommissionRule(id) {
        return commissionRuleRepository_1.commissionRuleRepository.delete(id);
    },
    // New search and pagination method
    async searchCommissionRules(params) {
        return commissionRuleRepository_1.commissionRuleRepository.searchAndPaginate(params);
    },
    // New method for updating CommissionRule status
    async updateCommissionRuleStatusService(ruleId, isActive) {
        try {
            // Check if rule exists
            const existingRule = await commissionRuleRepository_1.commissionRuleRepository.findById(ruleId);
            if (!existingRule) {
                throw new AppError_1.AppError(404, "ClientError", "Commission rule not found");
            }
            // Update the status
            const updatedRule = await commissionRuleRepository_1.commissionRuleRepository.updateCommissionRuleStatus(ruleId, isActive);
            if (!updatedRule) {
                throw new AppError_1.AppError(404, "ClientError", "Commission rule not found");
            }
            return updatedRule;
        }
        catch (err) {
            if (err instanceof AppError_1.AppError)
                throw err;
            throw new AppError_1.AppError(500, "ServerError", "Failed to update commission rule status", err);
        }
    },
    // Bulk update is_active for all rules by policy_name_id
    async updateCommissionRulesStatusByPolicyNameService(policyNameId, isActive) {
        // Optionally, check if policyNameId exists or has rules
        const result = await commissionRuleRepository_1.commissionRuleRepository.updateCommissionRulesStatusByPolicyName(policyNameId, isActive);
        return result;
    },
};
