import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class ReadinessService {
  constructor(private readonly prisma: PrismaService) {}

  async isDatabaseReady(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      // The endpoint is intentionally generic; do not expose connection details.
      return false;
    }
  }
}
