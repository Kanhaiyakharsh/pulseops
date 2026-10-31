import { z } from 'zod';

import { nodeEnvSchema } from './common';

export const dependencyNameSchema = z.enum(['mongodb', 'redis']);
export type DependencyName = z.infer<typeof dependencyNameSchema>;

export const dependencyCheckSchema = z.object({
  status: z.enum(['up', 'down']),
  latencyMs: z.number().nonnegative(),
  /** Only present outside production. */
  error: z.string().optional(),
});
export type DependencyCheck = z.infer<typeof dependencyCheckSchema>;

const healthBaseSchema = z.object({
  service: z.string(),
  version: z.string(),
  environment: nodeEnvSchema,
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string().datetime(),
});

/** GET /api/v1/health/live: process is up. */
export const livenessResponseSchema = healthBaseSchema.extend({
  status: z.literal('ok'),
});
export type LivenessResponse = z.infer<typeof livenessResponseSchema>;

/** GET /api/v1/health: process is up and its dependencies answer. */
export const healthResponseSchema = healthBaseSchema.extend({
  status: z.enum(['ok', 'error']),
  checks: z.object({
    mongodb: dependencyCheckSchema,
    redis: dependencyCheckSchema,
  }),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
