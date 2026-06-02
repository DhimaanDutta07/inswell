import { Request, Response } from 'express';
import { z } from 'zod';
import { policyTransactionService } from '../services/policyTransactionService';
import {
  policyTransactionSchema,
  policyTransactionQuerySchema,
} from '../schemas/policyTransactionSchema';
import { AppError } from '../utils/AppError';

function handleError(error: any, res: Response) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors });
  }
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error('PolicyTransaction error:', error);
  return res.status(500).json({ error: error?.message || 'Internal server error' });
}

export const policyTransactionController = {
  async getAll(req: Request, res: Response) {
    try {
      const query = policyTransactionQuerySchema.parse(req.query);
      const txns = await policyTransactionService.getAll(query);
      res.status(200).json(txns);
    } catch (error) {
      handleError(error, res);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const txn = await policyTransactionService.getById(id);
      if (!txn) return res.status(404).json({ error: 'Policy transaction not found' });
      res.status(200).json(txn);
    } catch (error) {
      handleError(error, res);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = policyTransactionSchema.parse(req.body);
      const txn = await policyTransactionService.create(data);
      res.status(201).json(txn);
    } catch (error) {
      handleError(error, res);
    }
  },
};
