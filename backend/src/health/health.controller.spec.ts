import { describe, expect, it, vi } from 'vitest';
import { HealthController } from './health.controller.js';
import { ReadinessService } from './readiness.service.js';

describe('HealthController', () => {
  it('returns HTTP 200 and a minimal ready response when MySQL is reachable', async () => {
    const readiness = { isDatabaseReady: vi.fn().mockResolvedValue(true) };
    const response = { status: vi.fn() };
    const controller = new HealthController(readiness as unknown as ReadinessService);

    await expect(controller.checkReadiness(response as never)).resolves.toEqual({
      status: 'ready',
    });
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('returns HTTP 503 and no database details when MySQL is unavailable', async () => {
    const readiness = { isDatabaseReady: vi.fn().mockResolvedValue(false) };
    const response = { status: vi.fn() };
    const controller = new HealthController(readiness as unknown as ReadinessService);

    const result = await controller.checkReadiness(response as never);

    expect(result).toEqual({ status: 'not_ready' });
    expect(JSON.stringify(result)).not.toContain('private connection detail');
    expect(response.status).toHaveBeenCalledWith(503);
  });
});
