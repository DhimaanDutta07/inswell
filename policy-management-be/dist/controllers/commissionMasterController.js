"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionMasterController = void 0;
const zod_1 = require("zod");
const commissionMasterService_1 = require("../services/commissionMasterService");
const commissionMasterSchema_1 = require("../schemas/commissionMasterSchema");
const AppError_1 = require("../utils/AppError");
function handleError(error, res) {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ error: error.errors });
    }
    if (error instanceof AppError_1.AppError) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('CommissionMaster error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
}
exports.commissionMasterController = {
    async getAll(req, res) {
        try {
            const query = commissionMasterSchema_1.commissionMasterQuerySchema.parse(req.query);
            const entries = await commissionMasterService_1.commissionMasterService.getAll(query);
            res.status(200).json(entries);
        }
        catch (error) {
            handleError(error, res);
        }
    },
    async getById(req, res) {
        try {
            const id = zod_1.z.string().uuid().parse(req.params.id);
            const entry = await commissionMasterService_1.commissionMasterService.getById(id);
            res.status(200).json(entry);
        }
        catch (error) {
            handleError(error, res);
        }
    },
    async create(req, res) {
        try {
            const data = commissionMasterSchema_1.commissionMasterSchema.parse(req.body);
            const entry = await commissionMasterService_1.commissionMasterService.create(data);
            res.status(201).json(entry);
        }
        catch (error) {
            handleError(error, res);
        }
    },
    async update(req, res) {
        try {
            const id = zod_1.z.string().uuid().parse(req.params.id);
            const data = commissionMasterSchema_1.commissionMasterUpdateSchema.parse(req.body);
            const entry = await commissionMasterService_1.commissionMasterService.update(id, data);
            res.status(200).json(entry);
        }
        catch (error) {
            handleError(error, res);
        }
    },
    async updateStatus(req, res) {
        try {
            const id = zod_1.z.string().uuid().parse(req.params.id);
            const { is_active } = commissionMasterSchema_1.commissionMasterStatusSchema.parse(req.body);
            const entry = await commissionMasterService_1.commissionMasterService.updateStatus(id, is_active);
            res.status(200).json(entry);
        }
        catch (error) {
            handleError(error, res);
        }
    },
};
