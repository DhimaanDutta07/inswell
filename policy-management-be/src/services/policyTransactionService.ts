import { PolicyTransaction } from '@prisma/client';
import { policyTransactionRepository } from '../repositories/policyTransactionRepository';
import { commissionMasterService } from './commissionMasterService';

type CreateInput = {
  policy_number: string;
  customer_name: string;
  category: string;
  sub_category: string;
  premium_amount: number;
  commission_percentage?: number;
};

// Commission Amount = (Premium Amount * Commission Percentage) / 100
export const computeCommissionAmount = (
  premiumAmount: number,
  commissionPercentage: number
): number => {
  const amount = (premiumAmount * commissionPercentage) / 100;
  // Keep two decimals to match the DECIMAL(12,2) column.
  return Math.round((amount + Number.EPSILON) * 100) / 100;
};

export const policyTransactionService = {
  getAll: (params: { search?: string; category?: string } = {}) =>
    policyTransactionRepository.findAll(params),

  getById: (id: string) => policyTransactionRepository.findById(id),

  create: async (data: CreateInput): Promise<PolicyTransaction> => {
    // Use the supplied percentage if present, otherwise pull the active master value.
    let commissionPercentage = data.commission_percentage;
    if (commissionPercentage === undefined) {
      const resolved = await commissionMasterService.resolvePercentage(
        data.category,
        data.sub_category
      );
      commissionPercentage = resolved.percentage;
    }

    const commissionAmount = computeCommissionAmount(data.premium_amount, commissionPercentage);

    return policyTransactionRepository.create({
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
