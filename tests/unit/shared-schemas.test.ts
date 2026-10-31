import {
  API_PREFIX,
  apiErrorSchema,
  healthResponseSchema,
  livenessResponseSchema,
} from '@pulseops/shared';
import { describe, expect, it } from 'vitest';

const base = {
  service: 'pulseops-backend',
  version: '0.1.0',
  environment: 'development',
  uptimeSeconds: 5,
  timestamp: '2026-10-31T10:00:00.000Z',
};

describe('shared schemas', () => {
  it('pins the API prefix to /api/v1', () => {
    expect(API_PREFIX).toBe('/api/v1');
  });

  it('accepts a valid health report', () => {
    const result = healthResponseSchema.safeParse({
      ...base,
      status: 'ok',
      checks: {
        mongodb: { status: 'up', latencyMs: 2.5 },
        redis: { status: 'up', latencyMs: 0.8 },
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a health report with a missing dependency', () => {
    const result = healthResponseSchema.safeParse({
      ...base,
      status: 'ok',
      checks: { mongodb: { status: 'up', latencyMs: 2.5 } },
    });
    expect(result.success).toBe(false);
  });

  it('only allows ok for liveness', () => {
    expect(livenessResponseSchema.safeParse({ ...base, status: 'ok' }).success).toBe(true);
    expect(livenessResponseSchema.safeParse({ ...base, status: 'error' }).success).toBe(false);
  });

  it('validates the error envelope', () => {
    const result = apiErrorSchema.safeParse({
      success: false,
      error: { code: 'NOT_FOUND', message: 'nope', requestId: 'abc' },
    });
    expect(result.success).toBe(true);
    expect(
      apiErrorSchema.safeParse({
        success: false,
        error: { code: 'MADE_UP', message: 'x', requestId: 'abc' },
      }).success,
    ).toBe(false);
  });
});
