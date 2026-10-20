import { PrismaClient } from '@prisma/client';
import { defaultCategories, seedDefaultCategories } from './seed-default-categories.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default categories...');
  await seedDefaultCategories(prisma);
  console.log(`Seeded ${defaultCategories.length} default categories.`);
}

main()
  .catch((error: unknown) => {
    console.error('Failed to seed default categories.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
