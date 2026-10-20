import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch {
      this.logger.warn(
        'Initial MySQL connection failed; the API will remain not-ready until the database is available.',
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
