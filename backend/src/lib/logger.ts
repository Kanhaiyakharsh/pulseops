import { type Logger, pino } from 'pino';
import pretty from 'pino-pretty';

export interface LoggerOptions {
  level: string;
  service: string;
  environment: string;
  /** Human-readable output for local development; JSON otherwise. */
  pretty: boolean;
}

export function createLogger(options: LoggerOptions): Logger {
  const base = {
    level: options.level,
    base: { service: options.service, environment: options.environment },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[redacted]',
    },
  };

  if (options.pretty) {
    return pino(
      base,
      pretty({
        colorize: true,
        translateTime: 'SYS:HH:MM:ss.l',
        ignore: 'pid,hostname,service,environment',
        sync: true,
      }),
    );
  }

  return pino({
    ...base,
    formatters: { level: (label) => ({ level: label }) },
  });
}
