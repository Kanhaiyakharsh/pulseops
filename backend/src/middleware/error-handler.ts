import type { ApiError } from '@pulseops/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@/lib/errors';
import { formatZodIssues } from '@/lib/validation';

interface HttpErrorLike {
  status: number;
  type?: string;
}

function isHttpErrorLike(error: unknown): error is HttpErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  );
}

function formatRequestId(id: string | number | object): string {
  if (typeof id === 'string') return id;
  if (typeof id === 'number') return id.toString();

  const serialized = JSON.stringify(id);
  if (serialized === undefined) {
    throw new TypeError('Request ID must be serializable');
  }
  return serialized;
}

/** Maps anything thrown in the request pipeline to an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: formatZodIssues(error),
    });
  }

  // Errors raised by Express/body-parser (http-errors).
  if (isHttpErrorLike(error)) {
    if (error.type === 'entity.parse.failed') {
      return new AppError({
        statusCode: 400,
        code: 'INVALID_JSON',
        message: 'Request body contains invalid JSON',
      });
    }
    if (error.type === 'entity.too.large') {
      return new AppError({
        statusCode: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body is too large',
      });
    }
    if (error.status >= 400 && error.status < 500) {
      return new AppError({
        statusCode: error.status,
        code: 'BAD_REQUEST',
        message: 'Bad request',
      });
    }
  }

  // Unknown error: a bug. Never leak its message to the client.
  return new AppError({
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    cause: error,
  });
}

/** Last middleware in the chain: one place that turns errors into the API error envelope. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = toAppError(error);

  if (appError.statusCode >= 500) {
    req.log.error({ err: error }, 'Unhandled error while processing request');
  } else {
    req.log.warn({ code: appError.code, statusCode: appError.statusCode }, appError.message);
  }

  const body: ApiError = {
    success: false,
    error: {
      code: appError.code,
      message: appError.message,
      requestId: formatRequestId(req.id),
      ...(appError.details !== undefined ? { details: appError.details } : {}),
    },
  };

  res.status(appError.statusCode).json(body);
};
