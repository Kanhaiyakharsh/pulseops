import { Router } from 'express';

import type { HealthService } from './health.service';

export function createHealthRouter(healthService: HealthService): Router {
  const router = Router();

  router.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Readiness: 200 when every dependency answers, 503 otherwise.
  router.get('/', async (_req, res) => {
    const report = await healthService.getReadiness();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  });

  // Liveness: the process is running. Never touches dependencies.
  router.get('/live', (_req, res) => {
    res.status(200).json(healthService.getLiveness());
  });

  return router;
}
