import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';
import { Transaction } from '../common/types.js';
import { CreateTransactionDto } from '../common/dto/create-transaction.dto.js';
import { UpdateTransactionDto } from '../common/dto/update-transaction.dto.js';
import { parseCivilDate } from '../common/utils/civil-date.js';

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTransactionDto): Promise<Transaction> {
    try {
      const record = await this.prisma.transaction.create({
        data: {
          amount: new Prisma.Decimal(data.amount),
          type: data.type,
          category: data.category,
          date: this.toDatabaseDate(data.date),
          note: data.note,
        },
      });
      return this.toTransaction(record);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async update(id: string, changes: UpdateTransactionDto): Promise<Transaction> {
    await this.findById(id); // throws NotFoundException if not found
    try {
      const record = await this.prisma.transaction.update({
        where: { id },
        data: {
          ...(changes.amount !== undefined && {
            amount: new Prisma.Decimal(changes.amount),
          }),
          ...(changes.type !== undefined && { type: changes.type }),
          ...(changes.category !== undefined && { category: changes.category }),
          ...(changes.date !== undefined && {
            date: this.toDatabaseDate(changes.date),
          }),
          ...(changes.note !== undefined && { note: changes.note }),
        },
      });
      return this.toTransaction(record);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async delete(id: string): Promise<void> {
    await this.findById(id); // throws NotFoundException if not found
    try {
      await this.prisma.transaction.delete({ where: { id } });
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async findAll(): Promise<Transaction[]> {
    try {
      const records = await this.prisma.transaction.findMany({
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      return records.map(this.toTransaction);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async findById(id: string): Promise<Transaction | null> {
    try {
      const record = await this.prisma.transaction.findUnique({ where: { id } });
      if (!record) throw new NotFoundException(`Transaction ${id} not found`);
      return this.toTransaction(record);
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw this.handleError(e);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toTransaction(record: {
    id: string;
    amount: Prisma.Decimal;
    type: string;
    category: string;
    date: Date;
    note: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Transaction {
    return {
      id: record.id,
      amount: record.amount.toFixed(2),
      type: record.type as Transaction['type'],
      category: record.category,
      date: this.fromDatabaseDate(record.date),
      note: record.note ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toDatabaseDate(value: string): Date {
    if (!parseCivilDate(value)) throw new Error('Invalid civil date');
    return new Date(`${value}T00:00:00.000Z`);
  }

  private fromDatabaseDate(value: Date): string {
    const year = String(value.getUTCFullYear()).padStart(4, '0');
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private handleError(e: unknown): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const err = e as Prisma.PrismaClientKnownRequestError;
      if (err.code === 'P2025') {
        return new NotFoundException('Record not found');
      }
    }
    return new InternalServerErrorException('Database operation failed');
  }
}
