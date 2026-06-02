"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionRuleRepository = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
exports.commissionRuleRepository = {
    findAll: async () => prismaClient_1.default.commissionRule.findMany({ orderBy: [{ productCategory: 'asc' }, { policyStatus: 'asc' }] }),
    findByProductCategory: async (productCategory) => prismaClient_1.default.commissionRule.findMany({
        where: { productCategory, is_active: true },
    }),
    upsertByKey: async (data) => {
        const existing = await prismaClient_1.default.commissionRule.findFirst({
            where: {
                productCategory: data.productCategory,
                policyStatus: data.policyStatus,
                deductibleType: data.deductibleType,
                ageCondition: data.ageCondition,
            },
        });
        if (existing) {
            return prismaClient_1.default.commissionRule.update({
                where: { id: existing.id },
                data: {
                    commissionPercent: data.commissionPercent,
                    is_active: data.is_active,
                },
            });
        }
        return prismaClient_1.default.commissionRule.create({ data });
    },
    findById: async (id) => prismaClient_1.default.commissionRule.findUnique({ where: { id } }),
    create: async (data) => prismaClient_1.default.commissionRule.create({ data }),
    update: async (id, data) => prismaClient_1.default.commissionRule.update({ where: { id }, data }),
    // New method for updating CommissionRule status
    updateCommissionRuleStatus: async (ruleId, isActive) => {
        try {
            return await prismaClient_1.default.commissionRule.update({
                where: { id: ruleId },
                data: { is_active: isActive },
            });
        }
        catch (err) {
            if (err.code === 'P2025') {
                throw new AppError_1.AppError(404, "ClientError", "Commission rule not found");
            }
            throw new AppError_1.AppError(500, "ServerError", "Error updating commission rule status", err);
        }
    },
    // New search and pagination method
    searchAndPaginate: async (params) => {
        const { search, policyStatus, deductibleType, ageCondition, page = 1, limit = 10 } = params;
        try {
            let whereConditions = {};
            // Handle search - primarily search by policy name
            if (search) {
                // First, try to find policy names that match the search
                const matchingPolicies = await prismaClient_1.default.policyName.findMany({
                    where: {
                        name: {
                            contains: search,
                        },
                    },
                    select: {
                        id: true,
                    },
                });
                if (matchingPolicies.length > 0) {
                    // Use the found policy IDs
                    whereConditions.policy_name_id = {
                        in: matchingPolicies.map(p => p.id),
                    };
                }
                else {
                    // If no policies found, return empty result
                    return {
                        data: [],
                        total: 0,
                        page,
                        limit,
                        totalPages: 0,
                    };
                }
            }
            // Handle specific filters
            if (policyStatus && policyStatus !== 'all') {
                whereConditions.policyStatus = policyStatus;
            }
            if (deductibleType && deductibleType !== 'all') {
                whereConditions.deductibleType = deductibleType;
            }
            if (ageCondition && ageCondition !== 'all') {
                whereConditions.ageCondition = ageCondition;
            }
            // Calculate pagination
            const skip = (page - 1) * limit;
            // Get total count
            const total = await prismaClient_1.default.commissionRule.count({
                where: whereConditions,
            });
            // Get paginated data with policy name
            const data = await prismaClient_1.default.commissionRule.findMany({
                where: whereConditions,
                include: {
                    policyName: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                skip,
                take: limit,
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const totalPages = Math.ceil(total / limit);
            return {
                data,
                total,
                page,
                limit,
                totalPages,
            };
        }
        catch (error) {
            console.error('Error in searchAndPaginate:', error);
            throw error;
        }
    },
    delete: async (id) => {
        try {
            const deleted = await prismaClient_1.default.commissionRule.delete({ where: { id } });
            return { success: true, data: deleted };
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
                return {
                    success: false,
                    error: 'Cannot delete commission rule because it is associated with other records.',
                };
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
                return {
                    success: false,
                    error: 'Commission rule not found.',
                };
            }
            console.error('Unexpected error deleting commission rule:', error);
            throw error;
        }
    },
    // Bulk update is_active for all rules by policy_name_id
    updateCommissionRulesStatusByPolicyName: async (policyNameId, isActive) => {
        try {
            const result = await prismaClient_1.default.commissionRule.updateMany({
                where: { policy_name_id: policyNameId },
                data: { is_active: isActive },
            });
            return result;
        }
        catch (err) {
            if (err.code === 'P2025') {
                throw new AppError_1.AppError(404, "ClientError", "No commission rules found for this product");
            }
            throw new AppError_1.AppError(500, "ServerError", "Error updating commission rules status", err);
        }
    },
};
