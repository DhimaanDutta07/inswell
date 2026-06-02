import axios from 'axios';
import { resolveProductCategoryFromGroupName } from '../constants/commissionCategories';

export interface CommissionRule {
  id: string;
  productCategory: string;
  policyStatus: 'Fresh' | 'Renewal' | 'Migration' | 'Portablity';
  ageCondition: 'LESS_THAN_60' | 'GREATER_THAN_60';
  deductibleType: 'ALL_SI' | 'DEDUCTABLE_ALL_SI' | 'LESS_THAN_10_LAKHS' | 'GREATER_EQUAL_10_LAKHS';
  commissionPercent: number;
  is_active: boolean;
}

export interface CommissionCalculationParams {
  policy_group_id?: string;
  policy_group_name?: string;
  policy_creation_status: 'Fresh' | 'Renewal' | 'Migration' | 'Portablity';
  proposer_dob: string;
  sum_insured: number;
  deductible_amount_status: boolean;
  premium_amount: number;
}

export const commissionCalculationService = {
  calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  },

  getAgeCondition(age: number): 'LESS_THAN_60' | 'GREATER_THAN_60' {
    return age < 60 ? 'LESS_THAN_60' : 'GREATER_THAN_60';
  },

  getDeductibleType(
    sumInsured: number,
    deductibleStatus: boolean
  ): 'ALL_SI' | 'DEDUCTABLE_ALL_SI' | 'LESS_THAN_10_LAKHS' | 'GREATER_EQUAL_10_LAKHS' {
    if (deductibleStatus === true) {
      return 'DEDUCTABLE_ALL_SI';
    }
    if (sumInsured < 1000000) {
      return 'LESS_THAN_10_LAKHS';
    }
    return 'GREATER_EQUAL_10_LAKHS';
  },

  normalizeStatus(
    status: CommissionCalculationParams['policy_creation_status']
  ): CommissionCalculationParams['policy_creation_status'] {
    if (status === 'Migration') return 'Portablity';
    return status;
  },

  async getCommissionRulesByGroup(policyGroupId: string): Promise<CommissionRule[]> {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/v1/commission-rules/group/${policyGroupId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching commission rules:', error);
      return [];
    }
  },

  async calculateCommission(params: CommissionCalculationParams): Promise<{
    calculated_commission_amount: number;
    base_percentage: number;
    total_percentage: number;
    rule_found: boolean;
  }> {
    try {
      if (!params.proposer_dob || params.premium_amount === undefined) {
        return {
          calculated_commission_amount: 0,
          base_percentage: 0,
          total_percentage: 0,
          rule_found: false,
        };
      }

      if (!params.policy_group_id && !params.policy_group_name) {
        return {
          calculated_commission_amount: 0,
          base_percentage: 0,
          total_percentage: 0,
          rule_found: false,
        };
      }

      const age = this.calculateAge(params.proposer_dob);
      const ageCondition = this.getAgeCondition(age);
      const deductibleType = this.getDeductibleType(
        params.sum_insured || 0,
        params.deductible_amount_status
      );
      const policyStatus = this.normalizeStatus(params.policy_creation_status);

      let rules: CommissionRule[] = [];
      if (params.policy_group_id) {
        rules = await this.getCommissionRulesByGroup(params.policy_group_id);
      }

      const category = resolveProductCategoryFromGroupName(params.policy_group_name);
      const matchingRule =
        rules.find(
          (rule) =>
            rule.productCategory === category &&
            rule.policyStatus === policyStatus &&
            rule.ageCondition === ageCondition &&
            rule.deductibleType === deductibleType &&
            rule.is_active !== false
        ) ??
        rules.find(
          (rule) =>
            rule.policyStatus === policyStatus &&
            rule.ageCondition === ageCondition &&
            rule.deductibleType === deductibleType &&
            rule.is_active !== false
        );

      if (!matchingRule) {
        return {
          calculated_commission_amount: 0,
          base_percentage: 0,
          total_percentage: 0,
          rule_found: false,
        };
      }

      const basePercentage = matchingRule.commissionPercent || 0;
      const calculatedCommission = (params.premium_amount * basePercentage) / 100;

      return {
        calculated_commission_amount: calculatedCommission,
        base_percentage: basePercentage,
        total_percentage: basePercentage,
        rule_found: true,
      };
    } catch (error) {
      console.error('Error calculating commission:', error);
      return {
        calculated_commission_amount: 0,
        base_percentage: 0,
        total_percentage: 0,
        rule_found: false,
      };
    }
  },
};
