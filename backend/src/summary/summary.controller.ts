import {
  Controller, Get, Query, BadRequestException,
} from '@nestjs/common';
import { SummarizerService } from './summarizer.service.js';
import { TransactionRepository } from '../transactions/transaction.repository.js';
import { Period } from '../common/types.js';

@Controller('summary')
export class SummaryController {
  constructor(
    private readonly summarizer: SummarizerService,
    private readonly transactionRepo: TransactionRepository,
  ) {}

  /**
   * GET /summary?period=monthly&date=2026-10-01
   * Returns total income, expenses, net balance, and category breakdown.
   */
  @Get()
  async getSummary(
    @Query('period') period: string,
    @Query('date') dateStr: string,
  ) {
    const validPeriods: Period[] = ['weekly', 'monthly', 'yearly'];
    if (!period || !validPeriods.includes(period as Period)) {
      throw new BadRequestException(
        'period must be one of: weekly, monthly, yearly',
      );
    }

    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      throw new BadRequestException('date must be a valid ISO 8601 date string');
    }

    const transactions = await this.transactionRepo.findAll();
    return this.summarizer.summarize(transactions, period as Period, date);
  }

  /**
   * GET /summary/weekly?month=2026-10-01
   * Returns week-by-week breakdown for the given calendar month.
   */
  @Get('weekly')
  async getWeeklyBreakdown(@Query('month') monthStr: string) {
    const month = monthStr ? new Date(monthStr) : new Date();
    if (isNaN(month.getTime())) {
      throw new BadRequestException('month must be a valid ISO 8601 date string');
    }

    const transactions = await this.transactionRepo.findAll();
    return this.summarizer.getWeeklyBreakdown(transactions, month);
  }
}
