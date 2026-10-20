import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, HttpCode, HttpStatus,
  BadRequestException,
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

    // Truncate note if needed
    if (dto.note) {
      const { value, truncated } = this.validator.truncateNote(dto.note);
      if (truncated) dto.note = value;
    }

    return this.repo.create(dto);
  }

  /** PATCH /transactions/:id — update an existing transaction */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    // Only validate fields that are present
    const partial: Record<string, unknown> = {};
    if (dto.amount !== undefined) partial['amount'] = dto.amount;
    if (dto.type !== undefined) partial['type'] = dto.type;
    if (dto.category !== undefined) partial['category'] = dto.category;
    if (dto.date !== undefined) partial['date'] = dto.date;

    if (Object.keys(partial).length > 0) {
      const validation = this.validator.validateTransaction(partial as any);
      if (!validation.valid) {
        throw new BadRequestException(validation.errors);
      }
    }

    if (dto.note) {
      const { value, truncated } = this.validator.truncateNote(dto.note);
      if (truncated) dto.note = value;
    }

    return this.repo.update(id, dto);
  }

  /** DELETE /transactions/:id — permanently remove a transaction */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.repo.delete(id);
  }
}
