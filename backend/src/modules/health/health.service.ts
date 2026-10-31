import type {
  DependencyCheck,
  DependencyName,
  HealthResponse,
  LivenessResponse,
  NodeEnv,
} from '@pulseops/shared';
import type { Logger } from 'pino';

import { withTimeout } from '@/lib/async';

export type DependencyProbes = Record<DependencyName, () => Promise<void>>;

export interface HealthMeta {
  service: string;
  version: string;
  environment: NodeEnv;
}

export interface HealthServiceOptions {
  logger: Logger;
  /** Include raw dependency error messages in responses (development only). */
  exposeErrorDetails: boolean;
  timeoutMs?: number;
}

const roundMs = (value: number): number => Math.round(value * 10) / 10;

export class HealthService {
  private readonly timeoutMs: number;

  constructor(
    private readonly probes: DependencyProbes,
    private readonly meta: HealthMeta,
    private readonly options: HealthServiceOptions,
  ) {
    this.timeoutMs = options.timeoutMs ?? 2_000;
  }

  getLiveness(): LivenessResponse {
    return { status: 'ok', ...this.baseInfo() };
  }

  async getReadiness(): Promise<HealthResponse> {
    const [mongodb, redis] = await Promise.all([this.runProbe('mongodb'), this.runProbe('redis')]);
    const healthy = mongodb.status === 'up' && redis.status === 'up';
    return {
      status: healthy ? 'ok' : 'error',
      ...this.baseInfo(),
      checks: { mongodb, redis },
    };
  }

  private baseInfo() {
    return {
      service: this.meta.service,
      version: this.meta.version,
      environment: this.meta.environment,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private async runProbe(name: DependencyName): Promise<DependencyCheck> {
    const startedAt = performance.now();
    try {
      await withTimeout(this.probes[name](), this.timeoutMs, name);
      return { status: 'up', latencyMs: roundMs(performance.now() - startedAt) };
    } catch (error) {
      this.options.logger.warn({ dependency: name, err: error }, 'Dependency health check failed');
      return {
        status: 'down',
        latencyMs: roundMs(performance.now() - startedAt),
        ...(this.options.exposeErrorDetails
          ? { error: error instanceof Error ? error.message : 'Unknown error' }
          : {}),
      };
    }
  }
}
