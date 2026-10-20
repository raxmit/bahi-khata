import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller.js';
import { TransactionRepository } from './transaction.repository.js';
import { PrismaService } from '../common/prisma.service.js';
import { FilterEngineService } from '../filter/filter-engine.service.js';
import { ValidatorService } from '../validator/validator.service.js';

@Module({
  controllers: [TransactionsController],
  providers: [
    TransactionRepository,
    PrismaService,
    FilterEngineService,
    ValidatorService,
  ],
  exports: [TransactionRepository],
})
export class TransactionsModule {}
