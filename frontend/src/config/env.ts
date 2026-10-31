import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z
    .string()
    .min(1, 'must not be empty')
    .regex(/^(\/|https?:\/\/)/, 'must be a path like /api/v1 or an absolute http(s) URL')
    .default('/api/v1'),
});

export type FrontendEnv = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid frontend environment: ${details}`);
}

/** Validated, typed browser-side configuration. */
export const env: FrontendEnv = parsed.data;
