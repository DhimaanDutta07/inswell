"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionMasterService = void 0;
const commissionMasterRepository_1 = require("../repositories/commissionMasterRepository");
const AppError_1 = require("../utils/AppError");
exports.commissionMasterService = {
    getAll: (params = {}) => commissionMasterRepository_1.commissionMasterRepository.findAll(params),
    getById: async (id) => {
        const entry = await commissionMasterRepository_1.commissionMasterRepository.findById(id);
        if (!entry)
            throw new AppError_1.AppError(404, 'ClientError', 'Commission entry not found');
        return entry;
    },
    create: (data) => commissionMasterRepository_1.commissionMasterRepository.create(data),
    update: (id, data) => commissionMasterRepository_1.commissionMasterRepository.update(id, data),
    updateStatus: (id, isActive) => commissionMasterRepository_1.commissionMasterRepository.updateStatus(id, isActive),
    // Resolve the active commission percentage for a category / sub_category pair.
    resolvePercentage: async (category, sub_category) => {
        const entry = await commissionMasterRepository_1.commissionMasterRepository.findActiveByCategory(category, sub_category);
        if (!entry) {
            throw new AppError_1.AppError(404, 'ClientError', `No active commission entry found for "${category}" / "${sub_category}"`);
        }
        return { entry, percentage: Number(entry.commission_percentage) };
    },
};
