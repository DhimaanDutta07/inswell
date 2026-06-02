/** Product categories aligned with commission dashboard */
export type ProductCategoryKey =
  | 'OPTIMA_SECURE'
  | 'OTHER_RETAIL'
  | 'STU'
  | 'PA_FRESH'
  | 'SME'
  | 'TRAVEL'
  | 'ALL';

export type CommissionRuleLeaf = {
  key: string;
  productCategory: ProductCategoryKey;
  policyStatus: 'Fresh' | 'Renewal' | 'Migration' | 'Portablity';
  deductibleType: 'ALL_SI' | 'DEDUCTABLE_ALL_SI' | 'LESS_THAN_10_LAKHS' | 'GREATER_EQUAL_10_LAKHS';
  label: string;
};

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategoryKey, string> = {
  OPTIMA_SECURE: 'Optima Secure',
  OTHER_RETAIL: 'Other Retail',
  STU: 'STU',
  PA_FRESH: 'PA (Fresh)',
  SME: 'SME',
  TRAVEL: 'Travel',
  ALL: 'All',
};

export const COMMISSION_CATEGORY_TREE: {
  category: ProductCategoryKey;
  branches: { status: string; statusLabel: string; leaves: CommissionRuleLeaf[] }[];
}[] = [
  {
    category: 'OPTIMA_SECURE',
    branches: [
      { status: 'Fresh', statusLabel: 'Fresh', leaves: [{ key: 'optima-fresh', productCategory: 'OPTIMA_SECURE', policyStatus: 'Fresh', deductibleType: 'ALL_SI', label: 'Fresh' }] },
      { status: 'Portablity', statusLabel: 'Portability', leaves: [{ key: 'optima-port-25k', productCategory: 'OPTIMA_SECURE', policyStatus: 'Portablity', deductibleType: 'DEDUCTABLE_ALL_SI', label: '25K Deductible (All SI)' }] },
    ],
  },
  {
    category: 'OTHER_RETAIL',
    branches: [
      {
        status: 'Fresh',
        statusLabel: 'Fresh',
        leaves: [
          { key: 'retail-fresh-lt10', productCategory: 'OTHER_RETAIL', policyStatus: 'Fresh', deductibleType: 'LESS_THAN_10_LAKHS', label: 'Less than 10 Lakhs' },
          { key: 'retail-fresh-gte10', productCategory: 'OTHER_RETAIL', policyStatus: 'Fresh', deductibleType: 'GREATER_EQUAL_10_LAKHS', label: 'Greater than or equal to 10 Lakhs' },
        ],
      },
      {
        status: 'Portablity',
        statusLabel: 'Portability',
        leaves: [
          { key: 'retail-port-25k', productCategory: 'OTHER_RETAIL', policyStatus: 'Portablity', deductibleType: 'DEDUCTABLE_ALL_SI', label: '25K Deductible (All SI)' },
          { key: 'retail-port-lt10', productCategory: 'OTHER_RETAIL', policyStatus: 'Portablity', deductibleType: 'LESS_THAN_10_LAKHS', label: 'Less than 10 Lakhs' },
        ],
      },
    ],
  },
  {
    category: 'STU',
    branches: [
      { status: 'Fresh', statusLabel: 'Fresh', leaves: [{ key: 'stu-fresh-gte10', productCategory: 'STU', policyStatus: 'Fresh', deductibleType: 'GREATER_EQUAL_10_LAKHS', label: 'Greater than or equal to 10 Lakhs' }] },
      { status: 'Portablity', statusLabel: 'Portability', leaves: [{ key: 'stu-port-lt10', productCategory: 'STU', policyStatus: 'Portablity', deductibleType: 'LESS_THAN_10_LAKHS', label: 'Less than 10 Lakhs' }] },
    ],
  },
  {
    category: 'PA_FRESH',
    branches: [
      { status: 'Fresh', statusLabel: 'Fresh', leaves: [{ key: 'pa-fresh-gte10', productCategory: 'PA_FRESH', policyStatus: 'Fresh', deductibleType: 'GREATER_EQUAL_10_LAKHS', label: 'Greater than or equal to 10 Lakhs' }] },
    ],
  },
  {
    category: 'SME',
    branches: [
      {
        status: 'Fresh',
        statusLabel: 'Fresh / Greater than or equal to 10 Lakhs',
        leaves: [
          { key: 'sme-fresh-lt10', productCategory: 'SME', policyStatus: 'Fresh', deductibleType: 'LESS_THAN_10_LAKHS', label: 'Less than 10 Lakhs' },
          { key: 'sme-gte10', productCategory: 'SME', policyStatus: 'Fresh', deductibleType: 'GREATER_EQUAL_10_LAKHS', label: 'Greater than or equal to 10 Lakhs' },
        ],
      },
    ],
  },
  {
    category: 'TRAVEL',
    branches: [{ status: 'Fresh', statusLabel: 'All SI', leaves: [{ key: 'travel-all', productCategory: 'TRAVEL', policyStatus: 'Fresh', deductibleType: 'ALL_SI', label: 'All SI' }] }],
  },
  {
    category: 'ALL',
    branches: [{ status: 'Fresh', statusLabel: 'All SI', leaves: [{ key: 'all-all', productCategory: 'ALL', policyStatus: 'Fresh', deductibleType: 'ALL_SI', label: 'All SI' }] }],
  },
];

export function resolveProductCategoryFromGroupName(policyGroupName?: string | null): ProductCategoryKey {
  const n = (policyGroupName || '').toUpperCase().trim();
  if (!n) return 'OTHER_RETAIL';
  if (n.includes('OPTIMA')) return 'OPTIMA_SECURE';
  if (n.includes('STU')) return 'STU';
  if (n === 'PA' || n.includes('PA ') || n.startsWith('PA(') || n.includes('PA (')) return 'PA_FRESH';
  if (n.includes('SME')) return 'SME';
  if (n.includes('TRAVEL')) return 'TRAVEL';
  if (n === 'ALL' || n.includes('ALL SI')) return 'ALL';
  return 'OTHER_RETAIL';
}
