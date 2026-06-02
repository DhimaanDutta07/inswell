"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyTransactionController = void 0;
const zod_1 = require("zod");
const policyTransactionService_1 = require("../services/policyTransactionService");
const policyTransactionSchema_1 = require("../schemas/policyTransactionSchema");
const AppError_1 = require("../utils/AppError");
function handleError(error, res) {
    if (error instanceof zod_1.z.ZodError) {
        return res.status(400).json({ error: error.errors });
    }
    if (error instanceof AppError_1.AppError) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('PolicyTransaction error:', error);
    return res.status(500).json({ error: error?.message || 'Internal server error' });
}
exports.policyTransactionController = {
    async getAll(req, res) {
        try {
            const query = policyTransactionSchema_1.policyTransactionQuerySchema.parse(req.query);
            const txns = await policyTransactionService_1.policyTransactionService.getAll(query);
            res.status(200).json(txns);
        }
        catch (error) {
            handleError(error, res);
        }
    },
    async getById(req, res) {
        try {
            const id = zod_1.z.string().uuid().parse(req.params.id);
            const txn = await policyTransactionService_1.policyTransactionService.getById(id);
            if (!txn)
                return res.status(404).json({ error: 'Policy transaction not found' });
            res.status(200).json(txn);
        }
        catch (error) {
            handleError(error, res);
        }
    },
    async create(req, res) {
        try {
            const data = policyTransactionSchema_1.policyTransactionSchema.parse(req.body);
            const txn = await policyTransactionService_1.policyTransactionService.create(data);
            res.status(201).json(txn);
        }
        catch (error) {
            handleError(error, res);
        }
    },
};
