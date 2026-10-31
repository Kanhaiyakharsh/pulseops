import { API_PREFIX } from '@pulseops/shared';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';

import { errorHandler } from '@/middleware/error-handler';
import { notFoundHandler } from '@/middleware/not-found';
import { createRequestLogger } from '@/middleware/request-logger';
import type { HealthService } from '@/modules/health/health.service';
import { createV1Router } from '@/routes/v1';

export interface AppOptions {
  logger: Logger;
  healthService: HealthService;
  corsOrigins: readonly string[];
}

/** Builds the Express app. No I/O happens here, so tests can inject fakes. */
export function createApp(options: AppOptions): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(createRequestLogger(options.logger));
  app.use(helmet());
  app.use(cors({ origin: [...options.corsOrigins], credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  app.use(API_PREFIX, createV1Router({ healthService: options.healthService }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
