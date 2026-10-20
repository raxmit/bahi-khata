import { BadRequestException } from '@nestjs/common';
import { SummaryController } from './summary.controller.js';
import type { SummarizerService } from './summarizer.service.js';
import type { TransactionRepository } from '../transactions/transaction.repository.js';

describe('SummaryController date-only query contract', () => {
  const findAll = vi.fn().mockResolvedValue([]);
  const summarize = vi.fn().mockReturnValue({ period: 'monthly' });
  const getWeeklyBreakdown = vi.fn().mockReturnValue([]);
  const controller = new SummaryController(
    { summarize, getWeeklyBreakdown } as unknown as SummarizerService,
    { findAll } as unknown as TransactionRepository,
  );

  beforeEach(() => vi.clearAllMocks());

  it('passes valid civil reference dates through without instant conversion', async () => {
    await controller.getSummary('monthly', '2026-03-01');
    expect(summarize).toHaveBeenCalledWith([], 'monthly', '2026-03-01');
  });

  it.each(['2026-02-30', '2026-03-01T00:00:00Z'])(
    'rejects invalid summary date %s',
    async (date) => {
      await expect(controller.getSummary('monthly', date)).rejects
        .toBeInstanceOf(BadRequestException);
      expect(findAll).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid monthly weekly-breakdown dates', async () => {
    await expect(controller.getWeeklyBreakdown('2025-02-29')).rejects
      .toBeInstanceOf(BadRequestException);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('passes a valid monthly weekly-breakdown date as a civil string', async () => {
    await controller.getWeeklyBreakdown('2026-05-15');
    expect(getWeeklyBreakdown).toHaveBeenCalledWith([], '2026-05-15');
  });
});
