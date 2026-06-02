import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// Best-effort interpretation of the commission classification spec.
// Percentages are editable from the Commission Management dashboard.
const commissionMasterSeed: Array<{
  category: string;
  sub_category: string;
  commission_percentage: number;
}> = [
  { category: 'Optima Secure - Fresh', sub_category: 'All SI', commission_percentage: 15.0 },
  { category: 'Optima Secure - Portability', sub_category: '25K Deductible (All SI)', commission_percentage: 12.5 },
  { category: 'Other Retail - Fresh', sub_category: 'Less than 10 Lakhs', commission_percentage: 20.0 },
  { category: 'Other Retail - Fresh', sub_category: 'Greater than or equal to 10 Lakhs', commission_percentage: 17.5 },
  { category: 'Other Retail - Portability', sub_category: '25K Deductible (All SI)', commission_percentage: 12.0 },
  { category: 'Other Retail - Portability', sub_category: 'Less than 10 Lakhs', commission_percentage: 15.0 },
  { category: 'STU - Fresh', sub_category: 'Greater than or equal to 10 Lakhs', commission_percentage: 18.0 },
  { category: 'STU - Portability', sub_category: 'Less than 10 Lakhs', commission_percentage: 14.0 },
  { category: 'PA (Fresh)', sub_category: 'Greater than or equal to 10 Lakhs', commission_percentage: 22.0 },
  { category: 'SME (Fresh)', sub_category: 'Less than 10 Lakhs', commission_percentage: 16.0 },
  { category: 'SME', sub_category: 'Greater than or equal to 10 Lakhs', commission_percentage: 13.0 },
  { category: 'Travel', sub_category: 'All SI', commission_percentage: 10.0 },
  { category: 'All', sub_category: 'All SI', commission_percentage: 10.0 },
];

export async function seedCommissionMaster() {
  console.log('🌱 Seeding commission_master...');
  for (const row of commissionMasterSeed) {
    const existing = await prisma.commissionMaster.findUnique({
      where: {
        category_sub_category: {
          category: row.category,
          sub_category: row.sub_category,
        },
      },
    });

    if (existing) {
      console.log(`ℹ️ Exists: ${row.category} / ${row.sub_category}`);
      continue;
    }

    await prisma.commissionMaster.create({
      data: {
        category: row.category,
        sub_category: row.sub_category,
        commission_percentage: new Prisma.Decimal(row.commission_percentage),
        is_active: true,
      },
    });
    console.log(`✅ Added: ${row.category} / ${row.sub_category} (${row.commission_percentage}%)`);
  }
  console.log('🎉 commission_master seeding complete.');
}

export default seedCommissionMaster;

// Allow running directly: `ts-node src/scripts/seedCommissionMaster.ts`
if (require.main === module) {
  seedCommissionMaster()
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
