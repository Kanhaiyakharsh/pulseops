import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, fetchHealth } from './api';

const report = {
  status: 'ok',
  service: 'pulseops-backend',
  version: '0.1.0',
  environment: 'development',
  uptimeSeconds: 12,
  timestamp: '2026-10-31T10:00:00.000Z',
  checks: {
    mongodb: { status: 'up', latencyMs: 3.2 },
    redis: { status: 'up', latencyMs: 1.1 },
  },
};

function mockFetch(response: Response | Error) {
  const fn = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  );
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchHealth', () => {
  it('returns the parsed report on 200', async () => {
    const fetchMock = mockFetch(Response.json(report));
    const result = await fetchHealth(undefined, '/api/v1');
    expect(result.status).toBe('ok');
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', expect.any(Object));
  });

  it('accepts a 503 report describing a down dependency', async () => {
    const degraded = {
      ...report,
      status: 'error',
      checks: { ...report.checks, redis: { status: 'down', latencyMs: 2000 } },
    };
    mockFetch(Response.json(degraded, { status: 503 }));
    const result = await fetchHealth(undefined, '/api/v1');
    expect(result.checks.redis.status).toBe('down');
  });

  it('throws ApiError for other HTTP statuses', async () => {
    mockFetch(new Response('bad gateway', { status: 502 }));
    await expect(fetchHealth(undefined, '/api/v1')).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError when the payload does not match the schema', async () => {
    mockFetch(Response.json({ hello: 'world' }));
    await expect(fetchHealth(undefined, '/api/v1')).rejects.toThrow('unexpected health report');
  });

  it('throws ApiError when the network request fails', async () => {
    mockFetch(new TypeError('fetch failed'));
    await expect(fetchHealth(undefined, '/api/v1')).rejects.toThrow('Cannot reach the API');
  });
});
