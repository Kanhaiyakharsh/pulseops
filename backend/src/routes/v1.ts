import { API_VERSION, APP_NAME } from '@pulseops/shared';
import { Router } from 'express';

import { createHealthRouter } from '@/modules/health/health.routes';
import type { HealthService } from '@/modules/health/health.service';

export interface V1Dependencies {
  healthService: HealthService;
}

/** Everything mounted here is served under /api/v1. */
export function createV1Router(deps: V1Dependencies): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ name: APP_NAME, apiVersion: API_VERSION });
  });

  router.use('/health', createHealthRouter(deps.healthService));

  return router;
}
