import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../common/prisma.service.js';
import { ReadinessService } from './readiness.service.js';

describe('ReadinessService', () => {
  it('reports ready when MySQL answers a query', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ ready: 1 }]);
    const service = new ReadinessService({ $queryRaw: queryRaw } as unknown as PrismaService);

    await expect(service.isDatabaseReady()).resolves.toBe(true);
    expect(queryRaw).toHaveBeenCalledOnce();
  });

  it('reports not-ready when MySQL is unavailable', async () => {
    const queryRaw = vi.fn().mockRejectedValue(new Error('private connection detail'));
    const service = new ReadinessService({ $queryRaw: queryRaw } as unknown as PrismaService);

    await expect(service.isDatabaseReady()).resolves.toBe(false);
  });
});
