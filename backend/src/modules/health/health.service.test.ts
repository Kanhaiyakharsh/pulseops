import { pino } from 'pino';
import { describe, expect, it } from 'vitest';

import { type DependencyProbes, HealthService } from './health.service';

const up = (): Promise<void> => Promise.resolve();

function createService(probes: Partial<DependencyProbes> = {}, exposeErrorDetails = true) {
  return new HealthService(
    { mongodb: up, redis: up, ...probes },
    { service: 'pulseops-backend', version: '0.0.0-test', environment: 'test' },
    { logger: pino({ level: 'silent' }), exposeErrorDetails, timeoutMs: 50 },
  );
}

describe('HealthService', () => {
  it('reports ok when every dependency answers', async () => {
    const report = await createService().getReadiness();
    expect(report.status).toBe('ok');
    expect(report.checks.mongodb.status).toBe('up');
    expect(report.checks.redis.status).toBe('up');
  });

  it('reports error and the failing dependency when one probe rejects', async () => {
    const report = await createService({
      redis: () => Promise.reject(new Error('connection refused')),
    }).getReadiness();
    expect(report.status).toBe('error');
    expect(report.checks.mongodb.status).toBe('up');
    expect(report.checks.redis).toMatchObject({ status: 'down', error: 'connection refused' });
  });

  it('treats a probe that never settles as down', async () => {
    const report = await createService({
      mongodb: () => new Promise<void>(() => undefined),
    }).getReadiness();
    expect(report.checks.mongodb.status).toBe('down');
    expect(report.checks.mongodb.error).toContain('timed out');
  });

  it('hides raw error messages when exposeErrorDetails is false', async () => {
    const report = await createService(
      { redis: () => Promise.reject(new Error('secret-host:6379 refused')) },
      false,
    ).getReadiness();
    expect(report.checks.redis.status).toBe('down');
    expect(report.checks.redis.error).toBeUndefined();
  });

  it('liveness never depends on probes', () => {
    const live = createService({ mongodb: () => Promise.reject(new Error('down')) }).getLiveness();
    expect(live.status).toBe('ok');
  });
});
