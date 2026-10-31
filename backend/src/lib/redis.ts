import { Redis } from 'ioredis';
import type { Logger } from 'pino';

import { withTimeout } from './async';

export function createRedisClient(url: string, logger: Logger): Redis {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    connectTimeout: 5_000,
  });

  client.on('error', (err: Error) => {
    logger.error({ err }, 'Redis error');
  });
  client.on('ready', () => {
    logger.info('Redis ready');
  });
  client.on('reconnecting', () => {
    logger.warn('Redis reconnecting');
  });

  return client;
}

export async function connectRedis(client: Redis, timeoutMs = 10_000): Promise<void> {
  await withTimeout(client.connect(), timeoutMs, 'Redis connection');
}

export async function pingRedis(client: Redis): Promise<void> {
  const reply = await client.ping();
  if (reply !== 'PONG') {
    throw new Error(`Unexpected Redis reply: ${reply}`);
  }
}

export async function disconnectRedis(client: Redis): Promise<void> {
  if (client.status === 'end') return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
}
