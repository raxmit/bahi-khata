import { describe, expect, it } from 'vitest';
import { defaultCategories, seedDefaultCategories } from './seed-default-categories.js';

describe('seedDefaultCategories', () => {
  it('creates exactly the default categories on a fresh database', async () => {
    const categories = new Map<string, { name: string; type: string; isDefault: boolean }>();
    const prisma = fakePrisma(categories);

    await seedDefaultCategories(prisma);

    expect([...categories.values()]).toHaveLength(10);
    expect([...categories.values()].every((category) => category.isDefault)).toBe(true);
    expect([...categories.keys()].sort()).toEqual(categoryKeys());
  });

  it('keeps exactly one of each default after repeated startup seeding', async () => {
    const categories = new Map<string, { name: string; type: string; isDefault: boolean }>();
    const prisma = fakePrisma(categories);

    await seedDefaultCategories(prisma);
    await seedDefaultCategories(prisma);

    expect([...categories.values()]).toHaveLength(defaultCategories.length);
    expect([...categories.keys()].sort()).toEqual(categoryKeys());
  });
});

function categoryKeys(): string[] {
  return defaultCategories.map(({ name, type }) => `${name}:${type}`).sort();
}

function fakePrisma(
  categories: Map<string, { name: string; type: string; isDefault: boolean }>,
) {
  return {
    category: {
      upsert: async ({
        where,
        create,
      }: {
        where: { name_type: { name: string; type: string } };
        update: Record<string, never>;
        create: { name: string; type: string; isDefault: boolean };
      }) => {
        const { name, type } = where.name_type;
        const key = `${name}:${type}`;
        if (!categories.has(key)) categories.set(key, create);
        return categories.get(key);
      },
    },
  } as unknown as Parameters<typeof seedDefaultCategories>[0];
}
