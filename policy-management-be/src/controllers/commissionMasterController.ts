import { Request, Response } from 'express';
import { z } from 'zod';
import { commissionMasterService } from '../services/commissionMasterService';
import {
  commissionMasterSchema,
  commissionMasterUpdateSchema,
  commissionMasterStatusSchema,
  commissionMasterQuerySchema,
} from '../schemas/commissionMasterSchema';
import { AppError } from '../utils/AppError';

function handleError(error: any, res: Response) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors });
  }
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error('CommissionMaster error:', error);
  return res.status(500).json({ error: error?.message || 'Internal server error' });
}

export const commissionMasterController = {
  async getAll(req: Request, res: Response) {
    try {
      const query = commissionMasterQuerySchema.parse(req.query);
      const entries = await commissionMasterService.getAll(query);
      res.status(200).json(entries);
    } catch (error) {
      handleError(error, res);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const entry = await commissionMasterService.getById(id);
      res.status(200).json(entry);
    } catch (error) {
      handleError(error, res);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = commissionMasterSchema.parse(req.body);
      const entry = await commissionMasterService.create(data);
      res.status(201).json(entry);
    } catch (error) {
      handleError(error, res);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const data = commissionMasterUpdateSchema.parse(req.body);
      const entry = await commissionMasterService.update(id, data);
      res.status(200).json(entry);
    } catch (error) {
      handleError(error, res);
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const { is_active } = commissionMasterStatusSchema.parse(req.body);
      const entry = await commissionMasterService.updateStatus(id, is_active);
      res.status(200).json(entry);
    } catch (error) {
      handleError(error, res);
    }
  },
};
