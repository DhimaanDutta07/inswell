import prisma from '../utils/prismaClient';
import { Prisma, PolicyTransaction } from '@prisma/client';

type CreateInput = {
  policy_number: string;
  customer_name: string;
  category: string;
  sub_category: string;
  premium_amount: number;
  commission_percentage: number;
  commission_amount: number;
};

type FindParams = {
  search?: string;
  category?: string;
};

export const policyTransactionRepository = {
  findAll: async (params: FindParams = {}): Promise<PolicyTransaction[]> => {
    const { search, category } = params;
    const where: Prisma.PolicyTransactionWhereInput = {};

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { policy_number: { contains: search, mode: 'insensitive' } },
        { customer_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    return prisma.policyTransaction.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  },

  findById: async (id: string): Promise<PolicyTransaction | null> =>
    prisma.policyTransaction.findUnique({ where: { id } }),

  create: async (data: CreateInput): Promise<PolicyTransaction> =>
    prisma.policyTransaction.create({
      data: {
        policy_number: data.policy_number,
        customer_name: data.customer_name,
        category: data.category,
        sub_category: data.sub_category,
        premium_amount: new Prisma.Decimal(data.premium_amount),
        commission_percentage: new Prisma.Decimal(data.commission_percentage),
        commission_amount: new Prisma.Decimal(data.commission_amount),
      },
    }),
};
