import {
  Controller, Get, Query, BadRequestException,
} from '@nestjs/common';
import { SummarizerService } from './summarizer.service.js';
import { TransactionRepository } from '../transactions/transaction.repository.js';
import { Period } from '../common/types.js';
import {
  isValidCivilDate,
  todayInTimeZone,
} from '../common/utils/civil-date.js';

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

    const date = dateStr === undefined ? todayInTimeZone() : dateStr;
    if (!isValidCivilDate(date)) {
      throw new BadRequestException('date must be a valid YYYY-MM-DD calendar date');
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
    const month = monthStr === undefined ? todayInTimeZone() : monthStr;
    if (!isValidCivilDate(month)) {
      throw new BadRequestException('month must be a valid YYYY-MM-DD calendar date');
    }

    const transactions = await this.transactionRepo.findAll();
    return this.summarizer.getWeeklyBreakdown(transactions, month);
  }
}
