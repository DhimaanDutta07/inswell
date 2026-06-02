import { ProductCategory, PolicyCreationStatus, DeductibleType, AgeCondition } from '@prisma/client';

/** Map policy group name to commission product category */
export function resolveProductCategory(policyGroupName?: string | null): ProductCategory {
  const n = (policyGroupName || '').toUpperCase().trim();
  if (!n) return ProductCategory.OTHER_RETAIL;
  if (n.includes('OPTIMA')) return ProductCategory.OPTIMA_SECURE;
  if (n.includes('STU')) return ProductCategory.STU;
  if (n === 'PA' || n.includes('PA ') || n.startsWith('PA(') || n.includes('PA (')) return ProductCategory.PA_FRESH;
  if (n.includes('SME')) return ProductCategory.SME;
  if (n.includes('TRAVEL')) return ProductCategory.TRAVEL;
  if (n === 'ALL' || n.includes('ALL SI')) return ProductCategory.ALL;
  return ProductCategory.OTHER_RETAIL;
}

/** Normalize portability/migration statuses for commission lookup */
export function normalizePolicyStatusForCommission(
  status?: PolicyCreationStatus | null
): PolicyCreationStatus {
  if (status === PolicyCreationStatus.Migration || status === PolicyCreationStatus.Portablity) {
    return PolicyCreationStatus.Portablity;
  }
  if (status === PolicyCreationStatus.Renewal) {
    return PolicyCreationStatus.Renewal;
  }
  return PolicyCreationStatus.Fresh;
}

export type CommissionRuleLeaf = {
  key: string;
  productCategory: ProductCategory;
  policyStatus: PolicyCreationStatus;
  deductibleType: DeductibleType;
  label: string;
};

/** Commission matrix leaves (both age bands use same % when saved) */
export const COMMISSION_RULE_LEAVES: CommissionRuleLeaf[] = [
  { key: 'optima-fresh', productCategory: ProductCategory.OPTIMA_SECURE, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.ALL_SI, label: 'Fresh' },
  { key: 'optima-port-25k', productCategory: ProductCategory.OPTIMA_SECURE, policyStatus: PolicyCreationStatus.Portablity, deductibleType: DeductibleType.DEDUCTABLE_ALL_SI, label: 'Portability — 25K Deductible (All SI)' },
  { key: 'retail-fresh-lt10', productCategory: ProductCategory.OTHER_RETAIL, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.LESS_THAN_10_LAKHS, label: 'Fresh — Less than 10 Lakhs' },
  { key: 'retail-fresh-gte10', productCategory: ProductCategory.OTHER_RETAIL, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.GREATER_EQUAL_10_LAKHS, label: 'Fresh — ≥ 10 Lakhs' },
  { key: 'retail-port-25k', productCategory: ProductCategory.OTHER_RETAIL, policyStatus: PolicyCreationStatus.Portablity, deductibleType: DeductibleType.DEDUCTABLE_ALL_SI, label: 'Portability — 25K Deductible (All SI)' },
  { key: 'retail-port-lt10', productCategory: ProductCategory.OTHER_RETAIL, policyStatus: PolicyCreationStatus.Portablity, deductibleType: DeductibleType.LESS_THAN_10_LAKHS, label: 'Portability — Less than 10 Lakhs' },
  { key: 'stu-fresh-gte10', productCategory: ProductCategory.STU, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.GREATER_EQUAL_10_LAKHS, label: 'Fresh — ≥ 10 Lakhs' },
  { key: 'stu-port-lt10', productCategory: ProductCategory.STU, policyStatus: PolicyCreationStatus.Portablity, deductibleType: DeductibleType.LESS_THAN_10_LAKHS, label: 'Portability — Less than 10 Lakhs' },
  { key: 'pa-fresh-gte10', productCategory: ProductCategory.PA_FRESH, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.GREATER_EQUAL_10_LAKHS, label: 'Fresh — ≥ 10 Lakhs' },
  { key: 'sme-fresh-lt10', productCategory: ProductCategory.SME, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.LESS_THAN_10_LAKHS, label: 'Fresh — Less than 10 Lakhs' },
  { key: 'sme-gte10', productCategory: ProductCategory.SME, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.GREATER_EQUAL_10_LAKHS, label: '≥ 10 Lakhs' },
  { key: 'travel-all', productCategory: ProductCategory.TRAVEL, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.ALL_SI, label: 'All SI' },
  { key: 'all-all', productCategory: ProductCategory.ALL, policyStatus: PolicyCreationStatus.Fresh, deductibleType: DeductibleType.ALL_SI, label: 'All SI' },
];

export function resolveDeductibleType(sumInsured: number, deductibleStatus: boolean): DeductibleType {
  if (deductibleStatus === true) {
    return DeductibleType.DEDUCTABLE_ALL_SI;
  }
  if (sumInsured < 1000000) {
    return DeductibleType.LESS_THAN_10_LAKHS;
  }
  return DeductibleType.GREATER_EQUAL_10_LAKHS;
}

export function resolveAgeCondition(dob: Date | string): AgeCondition {
  const birth = typeof dob === 'string' ? new Date(dob) : dob;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age < 60 ? AgeCondition.LESS_THAN_60 : AgeCondition.GREATER_THAN_60;
}
