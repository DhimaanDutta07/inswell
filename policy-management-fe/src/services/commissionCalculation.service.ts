import axios from 'axios';
import { resolveProductCategoryFromGroupName } from '../constants/commissionCategories';

export interface CommissionMasterEntry {
  id: string;
<<<<<<< HEAD
  productCategory: string;
  policyStatus: 'Fresh' | 'Renewal' | 'Migration' | 'Portablity';
  ageCondition: 'LESS_THAN_60' | 'GREATER_THAN_60';
  deductibleType: 'ALL_SI' | 'DEDUCTABLE_ALL_SI' | 'LESS_THAN_10_LAKHS' | 'GREATER_EQUAL_10_LAKHS';
  commissionPercent: number;
=======
  category: string;
  sub_category: string;
  commission_percentage: number;
>>>>>>> ad557664d3cc781693a63d983c62275dcb770300
  is_active: boolean;
}

export interface CommissionCalculationParams {
<<<<<<< HEAD
  policy_group_id?: string;
  policy_group_name?: string;
=======
  policy_name_id: string;
  policyName?: string;
>>>>>>> ad557664d3cc781693a63d983c62275dcb770300
  policy_creation_status: 'Fresh' | 'Renewal' | 'Migration' | 'Portablity';
  sum_insured: number;
  deductible_amount_status: boolean;
  premium_amount: number;
<<<<<<< HEAD
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
=======
}

function deriveCategory(policyName: string): string {
  const name = policyName.toLowerCase();
  if (name.includes('optima secure')) return 'Optima Secure';
  if (name.includes('stu')) return 'STU';
  if (name.includes('travel')) return 'Travel';
  if (name.includes('pa')) return 'PA (Fresh)';
  if (name.includes('sme')) {
    return 'SME';
  }
  return 'Other Retail';
}

function deriveSubCategory(
  category: string,
  policyStatus: string,
  sumInsured: number,
  deductibleStatus: boolean
): string[] {
  const isPortability = policyStatus === 'Portablity';

  if (category === 'Travel') return ['All SI'];
  if (category === 'All') return ['All SI'];
  if (category === 'PA (Fresh)') return ['Greater than or equal to 10 Lakhs'];
  if (category === 'SME (Fresh)') return ['Less than 10 Lakhs'];
  if (category === 'SME') return ['Greater than or equal to 10 Lakhs'];

  if (category === 'Optima Secure') {
    if (isPortability) return ['Portability - 25K Deductible (All SI)'];
    return ['Fresh'];
  }

  if (isPortability) {
    if (deductibleStatus) return ['Portability - 25K Deductible (All SI)', 'Portability - Less than 10 Lakhs'];
    return ['Portability - Less than 10 Lakhs', 'Portability - 25K Deductible (All SI)'];
  }

  if (sumInsured >= 1000000) {
    return ['Fresh - Greater than or equal to 10 Lakhs'];
  }
  return ['Fresh - Less than 10 Lakhs'];
}

export const commissionCalculationService = {
  async getCommissionMasterEntries(): Promise<CommissionMasterEntry[]> {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_BASE_URL}/api/v1/commission-master`,
>>>>>>> ad557664d3cc781693a63d983c62275dcb770300
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
        }
      );
      const data = response.data;
      return Array.isArray(data) ? data : (data?.data || []);
    } catch (error) {
      console.error('Error fetching commission master:', error);
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
<<<<<<< HEAD
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
      const matchingRule = rules.find(
        (rule) =>
          (rule.productCategory === category || rules.length === 0) &&
          rule.policyStatus === policyStatus &&
          rule.ageCondition === ageCondition &&
          rule.deductibleType === deductibleType &&
          rule.is_active !== false
      ) ?? rules.find(
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
=======
      if (!params.premium_amount || params.premium_amount <= 0) {
        return { calculated_commission_amount: 0, base_percentage: 0, total_percentage: 0, rule_found: false };
      }

      const entries = await this.getCommissionMasterEntries();
      const activeEntries = entries.filter(e => e.is_active);

      if (activeEntries.length === 0) {
        return { calculated_commission_amount: 0, base_percentage: 0, total_percentage: 0, rule_found: false };
      }

      const policyName = params.policyName || '';
      const category = deriveCategory(policyName);
      const subCategories = deriveSubCategory(
        category,
        params.policy_creation_status,
        params.sum_insured,
        params.deductible_amount_status
      );

      let match: CommissionMasterEntry | undefined;

      for (const sub of subCategories) {
        match = activeEntries.find(
          e => e.category.toLowerCase() === category.toLowerCase() &&
               e.sub_category.toLowerCase() === sub.toLowerCase()
        );
        if (match) break;
      }

      if (!match) {
        match = activeEntries.find(
          e => e.category.toLowerCase() === 'all' &&
               e.sub_category.toLowerCase() === 'all si'
        );
      }

      if (!match) {
        return { calculated_commission_amount: 0, base_percentage: 0, total_percentage: 0, rule_found: false };
      }

      const percentage = Number(match.commission_percentage) || 0;
      const commissionAmount = (params.premium_amount * percentage) / 100;

      return {
        calculated_commission_amount: commissionAmount,
        base_percentage: percentage,
        total_percentage: percentage,
>>>>>>> ad557664d3cc781693a63d983c62275dcb770300
        rule_found: true,
      };
    } catch (error) {
      console.error('Error calculating commission:', error);
<<<<<<< HEAD
      return {
        calculated_commission_amount: 0,
        base_percentage: 0,
        total_percentage: 0,
        rule_found: false,
      };
=======
      return { calculated_commission_amount: 0, base_percentage: 0, total_percentage: 0, rule_found: false };
>>>>>>> ad557664d3cc781693a63d983c62275dcb770300
    }
  },
};
