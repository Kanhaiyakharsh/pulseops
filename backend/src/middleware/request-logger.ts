import { randomUUID } from 'node:crypto';

import type { Logger } from 'pino';
import { type HttpLogger, pinoHttp } from 'pino-http';

import { API_PREFIX } from '@pulseops/shared';

const MAX_REQUEST_ID_LENGTH = 128;

/** Structured access log. Every request gets an id (honours inbound `x-request-id`). */
export function createRequestLogger(logger: Logger): HttpLogger {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const inbound = req.headers['x-request-id'];
      const id =
        typeof inbound === 'string' && inbound.length > 0 && inbound.length <= MAX_REQUEST_ID_LENGTH
          ? inbound
          : randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    // Orchestrators hit the liveness probe constantly; keep it out of the logs.
    autoLogging: {
      ignore: (req) => req.url === `${API_PREFIX}/health/live`,
    },
  });
}
