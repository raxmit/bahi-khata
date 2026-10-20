import type { PrismaClient, TransactionType } from '@prisma/client';

export declare const defaultCategories: ReadonlyArray<{
  name: string;
  type: TransactionType;
}>;

export declare function seedDefaultCategories(
  prisma: Pick<PrismaClient, 'category'>,
): Promise<void>;
