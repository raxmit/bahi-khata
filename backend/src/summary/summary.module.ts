import { Module } from '@nestjs/common';
import { SummaryController } from './summary.controller.js';
import { SummarizerService } from './summarizer.service.js';
import { TransactionsModule } from '../transactions/transactions.module.js';
import { PrismaService } from '../common/prisma.service.js';

@Module({
  imports: [TransactionsModule],
  controllers: [SummaryController],
  providers: [SummarizerService, PrismaService],
})
export class SummaryModule {}
