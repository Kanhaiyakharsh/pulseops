import type { z, ZodError } from 'zod';

import { ValidationError } from './errors';

export interface ValidationIssue {
  path: string;
  message: string;
  code: string;
}

export function formatZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/** Parses `value` with `schema` or throws a ValidationError (HTTP 400) listing every issue. */
export function parseWith<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError('Request validation failed', formatZodIssues(result.error));
  }
  return result.data as z.infer<S>;
}
