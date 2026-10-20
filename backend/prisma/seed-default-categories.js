export const defaultCategories = [
  { name: 'Salary', type: 'Income' },
  { name: 'Freelance', type: 'Income' },
  { name: 'Investment', type: 'Income' },
  { name: 'Gift', type: 'Income' },
  { name: 'Food', type: 'Expense' },
  { name: 'Rent', type: 'Expense' },
  { name: 'Transport', type: 'Expense' },
  { name: 'Healthcare', type: 'Expense' },
  { name: 'Entertainment', type: 'Expense' },
  { name: 'Utilities', type: 'Expense' },
];

/** @param {{ category: { upsert: (args: object) => Promise<unknown> } }} prisma */
export async function seedDefaultCategories(prisma) {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: { name_type: { name: category.name, type: category.type } },
      update: {},
      create: { ...category, isDefault: true },
    });
  }
}
