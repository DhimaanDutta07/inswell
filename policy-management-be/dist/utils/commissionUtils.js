"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMISSION_RULE_LEAVES = void 0;
exports.resolveProductCategory = resolveProductCategory;
exports.normalizePolicyStatusForCommission = normalizePolicyStatusForCommission;
exports.resolveDeductibleType = resolveDeductibleType;
exports.resolveAgeCondition = resolveAgeCondition;
const client_1 = require("@prisma/client");
/** Map policy group name to commission product category */
function resolveProductCategory(policyGroupName) {
    const n = (policyGroupName || '').toUpperCase().trim();
    if (!n)
        return client_1.ProductCategory.OTHER_RETAIL;
    if (n.includes('OPTIMA'))
        return client_1.ProductCategory.OPTIMA_SECURE;
    if (n.includes('STU'))
        return client_1.ProductCategory.STU;
    if (n === 'PA' || n.includes('PA ') || n.startsWith('PA(') || n.includes('PA ('))
        return client_1.ProductCategory.PA_FRESH;
    if (n.includes('SME'))
        return client_1.ProductCategory.SME;
    if (n.includes('TRAVEL'))
        return client_1.ProductCategory.TRAVEL;
    if (n === 'ALL' || n.includes('ALL SI'))
        return client_1.ProductCategory.ALL;
    return client_1.ProductCategory.OTHER_RETAIL;
}
/** Normalize portability/migration statuses for commission lookup */
function normalizePolicyStatusForCommission(status) {
    if (status === client_1.PolicyCreationStatus.Migration || status === client_1.PolicyCreationStatus.Portablity) {
        return client_1.PolicyCreationStatus.Portablity;
    }
    if (status === client_1.PolicyCreationStatus.Renewal) {
        return client_1.PolicyCreationStatus.Renewal;
    }
    return client_1.PolicyCreationStatus.Fresh;
}
/** Commission matrix leaves (both age bands use same % when saved) */
exports.COMMISSION_RULE_LEAVES = [
    { key: 'optima-fresh', productCategory: client_1.ProductCategory.OPTIMA_SECURE, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.ALL_SI, label: 'Fresh' },
    { key: 'optima-port-25k', productCategory: client_1.ProductCategory.OPTIMA_SECURE, policyStatus: client_1.PolicyCreationStatus.Portablity, deductibleType: client_1.DeductibleType.DEDUCTABLE_ALL_SI, label: 'Portability — 25K Deductible (All SI)' },
    { key: 'retail-fresh-lt10', productCategory: client_1.ProductCategory.OTHER_RETAIL, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.LESS_THAN_10_LAKHS, label: 'Fresh — Less than 10 Lakhs' },
    { key: 'retail-fresh-gte10', productCategory: client_1.ProductCategory.OTHER_RETAIL, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.GREATER_EQUAL_10_LAKHS, label: 'Fresh — ≥ 10 Lakhs' },
    { key: 'retail-port-25k', productCategory: client_1.ProductCategory.OTHER_RETAIL, policyStatus: client_1.PolicyCreationStatus.Portablity, deductibleType: client_1.DeductibleType.DEDUCTABLE_ALL_SI, label: 'Portability — 25K Deductible (All SI)' },
    { key: 'retail-port-lt10', productCategory: client_1.ProductCategory.OTHER_RETAIL, policyStatus: client_1.PolicyCreationStatus.Portablity, deductibleType: client_1.DeductibleType.LESS_THAN_10_LAKHS, label: 'Portability — Less than 10 Lakhs' },
    { key: 'stu-fresh-gte10', productCategory: client_1.ProductCategory.STU, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.GREATER_EQUAL_10_LAKHS, label: 'Fresh — ≥ 10 Lakhs' },
    { key: 'stu-port-lt10', productCategory: client_1.ProductCategory.STU, policyStatus: client_1.PolicyCreationStatus.Portablity, deductibleType: client_1.DeductibleType.LESS_THAN_10_LAKHS, label: 'Portability — Less than 10 Lakhs' },
    { key: 'pa-fresh-gte10', productCategory: client_1.ProductCategory.PA_FRESH, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.GREATER_EQUAL_10_LAKHS, label: 'Fresh — ≥ 10 Lakhs' },
    { key: 'sme-fresh-lt10', productCategory: client_1.ProductCategory.SME, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.LESS_THAN_10_LAKHS, label: 'Fresh — Less than 10 Lakhs' },
    { key: 'sme-gte10', productCategory: client_1.ProductCategory.SME, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.GREATER_EQUAL_10_LAKHS, label: '≥ 10 Lakhs' },
    { key: 'travel-all', productCategory: client_1.ProductCategory.TRAVEL, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.ALL_SI, label: 'All SI' },
    { key: 'all-all', productCategory: client_1.ProductCategory.ALL, policyStatus: client_1.PolicyCreationStatus.Fresh, deductibleType: client_1.DeductibleType.ALL_SI, label: 'All SI' },
];
function resolveDeductibleType(sumInsured, deductibleStatus) {
    if (deductibleStatus === true) {
        return client_1.DeductibleType.DEDUCTABLE_ALL_SI;
    }
    if (sumInsured < 1000000) {
        return client_1.DeductibleType.LESS_THAN_10_LAKHS;
    }
    return client_1.DeductibleType.GREATER_EQUAL_10_LAKHS;
}
function resolveAgeCondition(dob) {
    const birth = typeof dob === 'string' ? new Date(dob) : dob;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate()))
        age--;
    return age < 60 ? client_1.AgeCondition.LESS_THAN_60 : client_1.AgeCondition.GREATER_THAN_60;
}
