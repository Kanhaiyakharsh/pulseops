import { type HealthResponse, healthResponseSchema } from '@pulseops/shared';

import { env } from '@/config/env';

export class ApiError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ApiError';
  }
}

/**
 * GET /health. The API answers 503 with the same payload when a dependency is down,
 * so both 200 and 503 are valid reports; anything else is an API problem.
 */
export async function fetchHealth(
  signal?: AbortSignal,
  baseUrl: string = env.VITE_API_BASE_URL,
): Promise<HealthResponse> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/health`, {
      signal,
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError('Cannot reach the API', { cause: error });
  }

  if (response.status !== 200 && response.status !== 503) {
    throw new ApiError(`The API responded with HTTP ${response.status}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new ApiError('The API returned a response that is not JSON', { cause: error });
  }

  const parsed = healthResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError('The API returned an unexpected health report');
  }
  return parsed.data;
}
