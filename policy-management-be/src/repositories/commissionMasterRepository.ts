import prisma from '../utils/prismaClient';
import { Prisma, CommissionMaster } from '@prisma/client';
import { AppError } from '../utils/AppError';

type CreateInput = {
  category: string;
  sub_category: string;
  commission_percentage: number;
  is_active?: boolean;
};

type UpdateInput = Partial<CreateInput>;

type FindParams = {
  search?: string;
  category?: string;
  isActive?: boolean;
};

export const commissionMasterRepository = {
  findAll: async (params: FindParams = {}): Promise<CommissionMaster[]> => {
    const { search, category, isActive } = params;
    const where: Prisma.CommissionMasterWhereInput = {};

    if (typeof isActive === 'boolean') where.is_active = isActive;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { category: { contains: search, mode: 'insensitive' } },
        { sub_category: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.commissionMaster.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sub_category: 'asc' }],
    });
  },

  findById: async (id: string): Promise<CommissionMaster | null> =>
    prisma.commissionMaster.findUnique({ where: { id } }),

  // Returns the active commission row for a category / sub_category pair.
  findActiveByCategory: async (
    category: string,
    sub_category: string
  ): Promise<CommissionMaster | null> =>
    prisma.commissionMaster.findFirst({
      where: { category, sub_category, is_active: true },
    }),

  create: async (data: CreateInput): Promise<CommissionMaster> => {
    try {
      return await prisma.commissionMaster.create({
        data: {
          category: data.category,
          sub_category: data.sub_category,
          commission_percentage: new Prisma.Decimal(data.commission_percentage),
          is_active: data.is_active ?? true,
        },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2002') {
        throw new AppError(
          409,
          'ClientError',
          'A commission entry for this category and sub-category already exists.'
        );
      }
      throw err;
    }
  },

  update: async (id: string, data: UpdateInput): Promise<CommissionMaster> => {
    const updateData: Prisma.CommissionMasterUpdateInput = {};
    if (data.category !== undefined) updateData.category = data.category;
    if (data.sub_category !== undefined) updateData.sub_category = data.sub_category;
    if (data.commission_percentage !== undefined)
      updateData.commission_percentage = new Prisma.Decimal(data.commission_percentage);
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    try {
      return await prisma.commissionMaster.update({ where: { id }, data: updateData });
    } catch (err) {
      const code = (err as Prisma.PrismaClientKnownRequestError).code;
      if (code === 'P2025') {
        throw new AppError(404, 'ClientError', 'Commission entry not found');
      }
      if (code === 'P2002') {
        throw new AppError(
          409,
          'ClientError',
          'A commission entry for this category and sub-category already exists.'
        );
      }
      throw err;
    }
  },

  updateStatus: async (id: string, isActive: boolean): Promise<CommissionMaster> => {
    try {
      return await prisma.commissionMaster.update({
        where: { id },
        data: { is_active: isActive },
      });
    } catch (err) {
      if ((err as Prisma.PrismaClientKnownRequestError).code === 'P2025') {
        throw new AppError(404, 'ClientError', 'Commission entry not found');
      }
      throw err;
    }
  },
};
