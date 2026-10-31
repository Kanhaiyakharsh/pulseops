export const APP_NAME = 'PulseOps';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'INVALID_JSON',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
] as const;
