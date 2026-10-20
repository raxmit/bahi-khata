import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReadinessService } from './readiness.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get('ready')
  async checkReadiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ status: 'ready' | 'not_ready' }> {
    const ready = await this.readiness.isDatabaseReady();
    response.status(ready ? 200 : 503);
    return { status: ready ? 'ready' : 'not_ready' };
  }
}
