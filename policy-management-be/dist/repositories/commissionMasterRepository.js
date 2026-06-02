"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionMasterRepository = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const client_1 = require("@prisma/client");
const AppError_1 = require("../utils/AppError");
exports.commissionMasterRepository = {
    findAll: async (params = {}) => {
        const { search, category, isActive } = params;
        const where = {};
        if (typeof isActive === 'boolean')
            where.is_active = isActive;
        if (category)
            where.category = category;
        if (search) {
            where.OR = [
                { category: { contains: search, mode: 'insensitive' } },
                { sub_category: { contains: search, mode: 'insensitive' } },
            ];
        }
        return prismaClient_1.default.commissionMaster.findMany({
            where,
            orderBy: [{ category: 'asc' }, { sub_category: 'asc' }],
        });
    },
    findById: async (id) => prismaClient_1.default.commissionMaster.findUnique({ where: { id } }),
    // Returns the active commission row for a category / sub_category pair.
    findActiveByCategory: async (category, sub_category) => prismaClient_1.default.commissionMaster.findFirst({
        where: { category, sub_category, is_active: true },
    }),
    create: async (data) => {
        try {
            return await prismaClient_1.default.commissionMaster.create({
                data: {
                    category: data.category,
                    sub_category: data.sub_category,
                    commission_percentage: new client_1.Prisma.Decimal(data.commission_percentage),
                    is_active: data.is_active ?? true,
                },
            });
        }
        catch (err) {
            if (err.code === 'P2002') {
                throw new AppError_1.AppError(409, 'ClientError', 'A commission entry for this category and sub-category already exists.');
            }
            throw err;
        }
    },
    update: async (id, data) => {
        const updateData = {};
        if (data.category !== undefined)
            updateData.category = data.category;
        if (data.sub_category !== undefined)
            updateData.sub_category = data.sub_category;
        if (data.commission_percentage !== undefined)
            updateData.commission_percentage = new client_1.Prisma.Decimal(data.commission_percentage);
        if (data.is_active !== undefined)
            updateData.is_active = data.is_active;
        try {
            return await prismaClient_1.default.commissionMaster.update({ where: { id }, data: updateData });
        }
        catch (err) {
            const code = err.code;
            if (code === 'P2025') {
                throw new AppError_1.AppError(404, 'ClientError', 'Commission entry not found');
            }
            if (code === 'P2002') {
                throw new AppError_1.AppError(409, 'ClientError', 'A commission entry for this category and sub-category already exists.');
            }
            throw err;
        }
    },
    updateStatus: async (id, isActive) => {
        try {
            return await prismaClient_1.default.commissionMaster.update({
                where: { id },
                data: { is_active: isActive },
            });
        }
        catch (err) {
            if (err.code === 'P2025') {
                throw new AppError_1.AppError(404, 'ClientError', 'Commission entry not found');
            }
            throw err;
        }
    },
};
