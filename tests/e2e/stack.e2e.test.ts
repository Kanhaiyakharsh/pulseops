import { apiErrorSchema, healthResponseSchema } from '@pulseops/shared';
import { describe, expect, it } from 'vitest';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

describe('running stack', () => {
  it('backend liveness answers', async () => {
    const res = await fetch(`${API_URL}/health/live`);
    expect(res.status).toBe(200);
  });

  it('backend reports MongoDB and Redis as up', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(await res.json());
    expect(body.status).toBe('ok');
    expect(body.checks.mongodb.status).toBe('up');
    expect(body.checks.redis.status).toBe('up');
  });

  it('unversioned routes return the error envelope', async () => {
    const origin = new URL(API_URL).origin;
    const res = await fetch(`${origin}/health`);
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(await res.json()).error.code).toBe('NOT_FOUND');
  });

  it('frontend serves the app shell', async () => {
    const res = await fetch(FRONTEND_URL);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<div id="root">');
  });

  it('frontend proxies /api/v1 to the backend', async () => {
    const res = await fetch(`${FRONTEND_URL}/api/v1/health`);
    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(await res.json()).status).toBe('ok');
  });
});
