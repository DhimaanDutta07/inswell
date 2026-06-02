"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyTransactionRepository = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const client_1 = require("@prisma/client");
exports.policyTransactionRepository = {
    findAll: async (params = {}) => {
        const { search, category } = params;
        const where = {};
        if (category)
            where.category = category;
        if (search) {
            where.OR = [
                { policy_number: { contains: search, mode: 'insensitive' } },
                { customer_name: { contains: search, mode: 'insensitive' } },
            ];
        }
        return prismaClient_1.default.policyTransaction.findMany({
            where,
            orderBy: { created_at: 'desc' },
        });
    },
    findById: async (id) => prismaClient_1.default.policyTransaction.findUnique({ where: { id } }),
    create: async (data) => prismaClient_1.default.policyTransaction.create({
        data: {
            policy_number: data.policy_number,
            customer_name: data.customer_name,
            category: data.category,
            sub_category: data.sub_category,
            premium_amount: new client_1.Prisma.Decimal(data.premium_amount),
            commission_percentage: new client_1.Prisma.Decimal(data.commission_percentage),
            commission_amount: new client_1.Prisma.Decimal(data.commission_amount),
        },
    }),
};
