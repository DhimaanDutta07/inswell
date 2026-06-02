import { CommissionRule, AgeCondition } from '@prisma/client';
import { commissionRuleRepository } from '../repositories/commissionRuleRepository';
import { AppError } from '../utils/AppError';
import { COMMISSION_RULE_LEAVES } from '../utils/commissionUtils';

export const commissionRuleService = {
  async createCommissionRule(data: Omit<CommissionRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommissionRule> {
    const existing = await commissionRuleRepository.findAll();
    const isDuplicate = existing.some(
      (rule) =>
        rule.productCategory === data.productCategory &&
        rule.policyStatus === data.policyStatus &&
        rule.deductibleType === data.deductibleType &&
        rule.ageCondition === data.ageCondition
    );
    if (isDuplicate) {
      throw new Error('A commission rule with the same conditions already exists.');
    }
    return commissionRuleRepository.create(data);
  },

  async bulkUpsertCommissionRules(
    rules: Array<{
      productCategory: CommissionRule['productCategory'];
      policyStatus: CommissionRule['policyStatus'];
      deductibleType: CommissionRule['deductibleType'];
      commissionPercent: number;
      is_active?: boolean;
    }>
  ) {
    const results: CommissionRule[] = [];
    for (const leaf of rules) {
      for (const ageCondition of [AgeCondition.LESS_THAN_60, AgeCondition.GREATER_THAN_60]) {
        const saved = await commissionRuleRepository.upsertByKey({
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

  async getRulesByProductCategory(productCategory: CommissionRule['productCategory']) {
    return commissionRuleRepository.findByProductCategory(productCategory);
  },

  getCommissionMatrixTemplate() {
    return COMMISSION_RULE_LEAVES;
  },

  async getAllCommissionRules(): Promise<CommissionRule[]> {
    return commissionRuleRepository.findAll();
  },

  async getCommissionRuleById(id: string): Promise<CommissionRule | null> {
    return commissionRuleRepository.findById(id);
  },

  async updateCommissionRule(id: string, data: Partial<Omit<CommissionRule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CommissionRule> {
    return commissionRuleRepository.update(id, data);
  },

  async deleteCommissionRule(id: string) {
    return commissionRuleRepository.delete(id);
  },

  // New search and pagination method
  async searchCommissionRules(params: {
    search?: string;
    policyStatus?: string;
    deductibleType?: string;
    ageCondition?: string;
    page?: number;
    limit?: number;
  }) {
    return commissionRuleRepository.searchAndPaginate(params);
  },

  // New method for updating CommissionRule status
  async updateCommissionRuleStatusService(
    ruleId: string,
    isActive: boolean
  ): Promise<CommissionRule> {
    try {
      // Check if rule exists
      const existingRule = await commissionRuleRepository.findById(ruleId);
      if (!existingRule) {
        throw new AppError(404, "ClientError", "Commission rule not found");
      }

      // Update the status
      const updatedRule = await commissionRuleRepository.updateCommissionRuleStatus(ruleId, isActive);

      if (!updatedRule) {
        throw new AppError(404, "ClientError", "Commission rule not found");
      }

      return updatedRule;
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(500, "ServerError", "Failed to update commission rule status", err);
    }
  },

  // Bulk update is_active for all rules by policy_name_id
  async updateCommissionRulesStatusByPolicyNameService(policyNameId: string, isActive: boolean) {
    // Optionally, check if policyNameId exists or has rules
    const result = await commissionRuleRepository.updateCommissionRulesStatusByPolicyName(policyNameId, isActive);
    return result;
  },
};
