import {
  API_PREFIX,
  apiErrorSchema,
  healthResponseSchema,
  livenessResponseSchema,
} from '@pulseops/shared';
import express from 'express';
import { pino } from 'pino';
import request from 'supertest';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import { createApp } from '@/app';
import { errorHandler } from '@/middleware/error-handler';
import { createRequestLogger } from '@/middleware/request-logger';
import { type DependencyProbes, HealthService } from '@/modules/health/health.service';
import { parseWith } from '@/lib/validation';

const logger = pino({ level: 'silent' });
const up = (): Promise<void> => Promise.resolve();

function buildApp(probes: Partial<DependencyProbes> = {}) {
  const healthService = new HealthService(
    { mongodb: up, redis: up, ...probes },
    { service: 'pulseops-backend', version: '0.0.0-test', environment: 'test' },
    { logger, exposeErrorDetails: true, timeoutMs: 50 },
  );
  return createApp({ logger, healthService, corsOrigins: ['http://localhost:5173'] });
}

describe('GET /api/v1/health', () => {
  it('returns 200 with dependency checks when everything is up', async () => {
    const res = await request(buildApp()).get(`${API_PREFIX}/health`);
    expect(res.status).toBe(200);
    const body = healthResponseSchema.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.checks.mongodb.status).toBe('up');
    expect(body.checks.redis.status).toBe('up');
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns 503 when a dependency is down', async () => {
    const app = buildApp({ redis: () => Promise.reject(new Error('ECONNREFUSED')) });
    const res = await request(app).get(`${API_PREFIX}/health`);
    expect(res.status).toBe(503);
    const body = healthResponseSchema.parse(res.body);
    expect(body.status).toBe('error');
    expect(body.checks.redis.status).toBe('down');
  });
});

describe('GET /api/v1/health/live', () => {
  it('returns 200 even when dependencies are down', async () => {
    const app = buildApp({ mongodb: () => Promise.reject(new Error('down')) });
    const res = await request(app).get(`${API_PREFIX}/health/live`);
    expect(res.status).toBe(200);
    expect(livenessResponseSchema.parse(res.body).status).toBe('ok');
  });
});

describe('API versioning and error handling', () => {
  it('serves API info at /api/v1', async () => {
    const res = await request(buildApp()).get(API_PREFIX);
    expect(res.status).toBe(200);
  });

  it('does not serve unversioned routes', async () => {
    const res = await request(buildApp()).get('/health');
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('returns the error envelope for unknown routes', async () => {
    const res = await request(buildApp()).get(`${API_PREFIX}/nope`);
    expect(res.status).toBe(404);
    const body = apiErrorSchema.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.requestId.length).toBeGreaterThan(0);
  });

  it('returns INVALID_JSON for malformed bodies', async () => {
    const res = await request(buildApp())
      .post(`${API_PREFIX}/health`)
      .set('content-type', 'application/json')
      .send('{bad json');
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('INVALID_JSON');
  });

  it('echoes an inbound x-request-id and returns it in the error body', async () => {
    const res = await request(buildApp()).get('/missing').set('x-request-id', 'trace-123');
    expect(res.headers['x-request-id']).toBe('trace-123');
    expect(apiErrorSchema.parse(res.body).error.requestId).toBe('trace-123');
  });

  it('sets security headers and hides the framework', async () => {
    const res = await request(buildApp()).get(`${API_PREFIX}/health/live`);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('error handler', () => {
  const app = express();
  app.use(createRequestLogger(logger));
  app.use(express.json());
  app.post('/items', (req, res) => {
    const input = parseWith(z.object({ name: z.string().min(1) }), req.body);
    res.status(201).json(input);
  });
  app.get('/boom', () => {
    throw new Error('database password is hunter2');
  });
  app.use(errorHandler);

  it('returns 400 VALIDATION_ERROR with issue details', async () => {
    const res = await request(app).post('/items').send({ name: '' });
    expect(res.status).toBe(400);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(body.error.details)).toContain('name');
  });

  it('accepts valid input', async () => {
    const res = await request(app).post('/items').send({ name: 'ok' });
    expect(res.status).toBe(201);
  });

  it('hides the message of unexpected errors', async () => {
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });
});
