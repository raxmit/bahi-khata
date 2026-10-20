import { Module } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { HealthController } from './health.controller.js';
import { ReadinessService } from './readiness.service.js';

@Module({
  controllers: [HealthController],
  providers: [PrismaService, ReadinessService],
})
export class HealthModule {}
