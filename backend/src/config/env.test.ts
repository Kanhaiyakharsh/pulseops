import { describe, expect, it } from 'vitest';

import { EnvValidationError, loadEnv } from './env';

const valid = {
  MONGODB_URI: 'mongodb://localhost:27017/test',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(valid);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(4000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('coerces numeric values and parses comma-separated CORS origins', () => {
    const env = loadEnv({
      ...valid,
      PORT: '5050',
      CORS_ORIGINS: 'http://localhost:5173, https://app.example.com',
    });
    expect(env.PORT).toBe(5050);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:5173', 'https://app.example.com']);
  });

  it('reports every invalid variable in one error', () => {
    expect.assertions(3);
    try {
      loadEnv({ PORT: '70000', REDIS_URL: 'http://nope' });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const message = (error as EnvValidationError).message;
      expect(message).toContain('MONGODB_URI');
      expect(message).toContain('PORT');
    }
  });

  it('rejects an invalid NODE_ENV', () => {
    expect(() => loadEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(EnvValidationError);
  });
});
