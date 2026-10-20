import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  // Income categories
  { name: 'Salary',       type: 'Income'  as const },
  { name: 'Freelance',    type: 'Income'  as const },
  { name: 'Investment',   type: 'Income'  as const },
  { name: 'Gift',         type: 'Income'  as const },
  // Expense categories
  { name: 'Food',         type: 'Expense' as const },
  { name: 'Rent',         type: 'Expense' as const },
  { name: 'Transport',    type: 'Expense' as const },
  { name: 'Healthcare',   type: 'Expense' as const },
  { name: 'Entertainment',type: 'Expense' as const },
  { name: 'Utilities',    type: 'Expense' as const },
];

async function main() {
  console.log('Seeding default categories...');

  for (const cat of defaultCategories) {
    await prisma.category.upsert({
      where: { name_type: { name: cat.name, type: cat.type } },
      update: {},
      create: { name: cat.name, type: cat.type, isDefault: true },
    });
  }

  console.log(`Seeded ${defaultCategories.length} default categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
