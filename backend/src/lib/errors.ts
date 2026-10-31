import type { ErrorCode } from '@pulseops/shared';

export interface AppErrorParams {
  statusCode: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
  cause?: unknown;
}

/** Operational error: safe to show to clients. Anything else is treated as a bug (HTTP 500). */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: unknown;

  constructor(params: AppErrorParams) {
    super(params.message, { cause: params.cause });
    this.name = new.target.name;
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.details = params.details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: unknown) {
    super({ statusCode: 400, code: 'BAD_REQUEST', message, details });
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Request validation failed', details?: unknown) {
    super({ statusCode: 400, code: 'VALIDATION_ERROR', message, details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super({ statusCode: 401, code: 'UNAUTHORIZED', message });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this resource') {
    super({ statusCode: 403, code: 'FORBIDDEN', message });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super({ statusCode: 404, code: 'NOT_FOUND', message });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details?: unknown) {
    super({ statusCode: 409, code: 'CONFLICT', message, details });
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super({ statusCode: 503, code: 'SERVICE_UNAVAILABLE', message });
  }
}
