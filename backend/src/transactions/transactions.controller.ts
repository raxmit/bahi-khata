import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { TransactionRepository } from './transaction.repository.js';
import { FilterEngineService } from '../filter/filter-engine.service.js';
import { ValidatorService } from '../validator/validator.service.js';
import { CreateTransactionDto } from '../common/dto/create-transaction.dto.js';
import { UpdateTransactionDto } from '../common/dto/update-transaction.dto.js';
import { FilterCriteriaDto } from '../common/dto/filter-criteria.dto.js';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly repo: TransactionRepository,
    private readonly filterEngine: FilterEngineService,
    private readonly validator: ValidatorService,
  ) {}

  /** GET /transactions — list all, with optional filtering */
  @Get()
  async findAll(@Query() query: FilterCriteriaDto) {
    // Validate date range if both provided
    const filterValidation = this.validator.validateFilter(query);
    if (!filterValidation.valid) {
      throw new BadRequestException(filterValidation.errors);
    }

    const all = await this.repo.findAll();

    const hasCriteria =
      query.type ?? query.categories ?? query.startDate ?? query.endDate;

    if (!hasCriteria) return all;

    return this.filterEngine.applyFilter(all, query);
  }

  /** POST /transactions — create a new transaction */
  @Post()
  async create(@Body() dto: CreateTransactionDto) {
    // Business-rule validation (amount > 0, date not future, etc.)
    const validation = this.validator.validateTransaction(dto);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    return this.repo.create(dto);
  }

  /** PATCH /transactions/:id — update an existing transaction */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    const supplied: UpdateTransactionDto = {};
    for (const field of ['amount', 'type', 'category', 'date', 'note'] as const) {
      if (dto[field] !== undefined) supplied[field] = dto[field] as never;
    }

    if (Object.keys(supplied).length === 0) {
      throw new BadRequestException({ patch: 'At least one field must be provided' });
    }

    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    const merged: CreateTransactionDto = {
      amount: (supplied.amount !== undefined ? supplied.amount : existing.amount) as string,
      type: (supplied.type !== undefined ? supplied.type : existing.type) as CreateTransactionDto['type'],
      category: (supplied.category !== undefined ? supplied.category : existing.category) as string,
      date: (supplied.date !== undefined ? supplied.date : existing.date) as string,
      note: supplied.note !== undefined ? supplied.note : existing.note,
    };
    const validation = this.validator.validateTransaction(merged);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }

    return this.repo.update(id, supplied);
  }

  /** DELETE /transactions/:id — permanently remove a transaction */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.repo.delete(id);
  }
}
