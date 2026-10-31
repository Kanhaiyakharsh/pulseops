import type { Server } from 'node:http';

import { createApp } from '@/app';
import { loadDotenvFiles } from '@/config/dotenv';
import { EnvValidationError, loadEnv } from '@/config/env';
import { createLogger } from '@/lib/logger';
import { connectMongo, disconnectMongo, pingMongo } from '@/lib/mongo';
import { connectRedis, createRedisClient, disconnectRedis, pingRedis } from '@/lib/redis';
import { HealthService } from '@/modules/health/health.service';

const SERVICE_NAME = 'pulseops-backend';

async function main(): Promise<void> {
  loadDotenvFiles();
  const env = loadEnv();

  const logger = createLogger({
    level: env.LOG_LEVEL,
    service: SERVICE_NAME,
    environment: env.NODE_ENV,
    pretty: env.NODE_ENV === 'development',
  });

  let server: Server | undefined;
  const redis = createRedisClient(env.REDIS_URL, logger);
  let shuttingDown = false;

  const shutdown = async (reason: string, exitCode: number): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, 'Shutting down');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
      const activeServer = server;
      if (activeServer?.listening) {
        await new Promise<void>((resolve, reject) => {
          activeServer.close((error) => {
            if (error) reject(error);
            else resolve();
          });
          activeServer.closeIdleConnections();
        });
      }
      await Promise.allSettled([disconnectMongo(), disconnectRedis(redis)]);
      logger.info('Shutdown complete');
      process.exit(exitCode);
    } catch (error) {
      logger.error({ err: error }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.once('SIGINT', () => void shutdown('SIGINT', 0));
  process.once('SIGTERM', () => void shutdown('SIGTERM', 0));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    void shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException', 1);
  });

  try {
    await connectMongo(env.MONGODB_URI, logger);
    await connectRedis(redis);

    const healthService = new HealthService(
      { mongodb: pingMongo, redis: () => pingRedis(redis) },
      { service: SERVICE_NAME, version: env.APP_VERSION, environment: env.NODE_ENV },
      { logger, exposeErrorDetails: env.NODE_ENV !== 'production' },
    );

    const app = createApp({ logger, healthService, corsOrigins: env.CORS_ORIGINS });

    server = app.listen(env.PORT, env.HOST);
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;

    server.once('listening', () => {
      logger.info(
        { host: env.HOST, port: env.PORT, environment: env.NODE_ENV },
        'PulseOps backend listening',
      );
    });
    server.once('error', (error) => {
      logger.fatal({ err: error }, 'HTTP server error');
      void shutdown('server error', 1);
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start PulseOps backend');
    await shutdown('startup failure', 1);
  }
}

main().catch((error: unknown) => {
  if (error instanceof EnvValidationError) {
    console.error(error.message);
  } else {
    console.error('Failed to start PulseOps backend:', error);
  }
  process.exit(1);
});
