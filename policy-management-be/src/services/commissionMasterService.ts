import { CommissionMaster } from '@prisma/client';
import { commissionMasterRepository } from '../repositories/commissionMasterRepository';
import { AppError } from '../utils/AppError';

type CreateInput = {
  category: string;
  sub_category: string;
  commission_percentage: number;
  is_active?: boolean;
};

export const commissionMasterService = {
  getAll: (params: { search?: string; category?: string; isActive?: boolean } = {}) =>
    commissionMasterRepository.findAll(params),

  getById: async (id: string): Promise<CommissionMaster> => {
    const entry = await commissionMasterRepository.findById(id);
    if (!entry) throw new AppError(404, 'ClientError', 'Commission entry not found');
    return entry;
  },

  create: (data: CreateInput) => commissionMasterRepository.create(data),

  update: (id: string, data: Partial<CreateInput>) =>
    commissionMasterRepository.update(id, data),

  updateStatus: (id: string, isActive: boolean) =>
    commissionMasterRepository.updateStatus(id, isActive),

  // Resolve the active commission percentage for a category / sub_category pair.
  resolvePercentage: async (
    category: string,
    sub_category: string
  ): Promise<{ entry: CommissionMaster; percentage: number }> => {
    const entry = await commissionMasterRepository.findActiveByCategory(category, sub_category);
    if (!entry) {
      throw new AppError(
        404,
        'ClientError',
        `No active commission entry found for "${category}" / "${sub_category}"`
      );
    }
    return { entry, percentage: Number(entry.commission_percentage) };
  },
};
