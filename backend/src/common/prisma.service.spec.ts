import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService startup', () => {
  it('continues startup with a generic warning when the initial database connection fails', async () => {
    const service = new PrismaService();
    const connect = vi
      .spyOn(service, '$connect')
      .mockRejectedValue(new Error('private database URL and password'));
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    await expect(service.onModuleInit()).resolves.toBeUndefined();

    expect(connect).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      'Initial MySQL connection failed; the API will remain not-ready until the database is available.',
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private database URL');
    warn.mockRestore();
    await service.$disconnect();
  });
});
