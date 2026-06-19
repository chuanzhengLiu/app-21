import { Injectable, LoggerService, LogLevel, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { RequestContextService } from './request-context';

type StructuredMeta = Record<string, unknown>;

@Injectable({ scope: Scope.DEFAULT })
export class AppLoggerService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor() {
    const level = process.env.LOG_LEVEL || 'info';
    const isProd = process.env.NODE_ENV === 'production';
    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports: [
        new winston.transports.Console({
          handleExceptions: true,
          handleRejections: true,
          silent: process.env.LOG_SILENT === 'true',
        }),
      ],
      exitOnError: false,
    });
    if (!isProd) {
      this.logger.debug('AppLoggerService initialized', { level });
    }
  }

  private buildMeta(context?: string, extra?: StructuredMeta): StructuredMeta {
    const ctx = RequestContextService.getStorage().getStore();
    const meta: StructuredMeta = {
      ...(context ? { context } : {}),
      ...(ctx
        ? {
            trace_id: ctx.trace_id,
            user_id: ctx.user_id ?? null,
            method: ctx.method,
            path: ctx.path,
          }
        : {}),
      ...(extra || {}),
    };
    return meta;
  }

  private normalize(message: unknown): { msg: string; extra: StructuredMeta } {
    if (message instanceof Error) {
      return {
        msg: message.message,
        extra: { stack: message.stack, name: message.name },
      };
    }
    if (typeof message === 'object' && message !== null) {
      try {
        return { msg: JSON.stringify(message), extra: {} };
      } catch {
        return { msg: String(message), extra: {} };
      }
    }
    return { msg: String(message), extra: {} };
  }

  log(message: any, context?: string): void {
    const { msg, extra } = this.normalize(message);
    this.logger.info(msg, this.buildMeta(context, extra));
  }

  error(message: any, stack?: string, context?: string): void {
    const { msg, extra } = this.normalize(message);
    const meta = this.buildMeta(context, {
      ...extra,
      ...(stack ? { stack } : {}),
    });
    this.logger.error(msg, meta);
  }

  warn(message: any, context?: string): void {
    const { msg, extra } = this.normalize(message);
    this.logger.warn(msg, this.buildMeta(context, extra));
  }

  debug(message: any, context?: string): void {
    const { msg, extra } = this.normalize(message);
    this.logger.debug(msg, this.buildMeta(context, extra));
  }

  verbose(message: any, context?: string): void {
    const { msg, extra } = this.normalize(message);
    this.logger.verbose(msg, this.buildMeta(context, extra));
  }

  setLogLevels(levels: LogLevel[]): void {
    if (!levels || levels.length === 0) return;
    const priority: Record<LogLevel, number> = {
      verbose: 0,
      debug: 1,
      log: 2,
      warn: 3,
      error: 4,
      fatal: 5,
    };
    const winstonLevelMap: Record<LogLevel, string> = {
      verbose: 'verbose',
      debug: 'debug',
      log: 'info',
      warn: 'warn',
      error: 'error',
      fatal: 'error',
    };
    const lowest = [...levels].sort((a, b) => priority[a] - priority[b])[0];
    this.logger.level = winstonLevelMap[lowest];
  }

  structured(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: StructuredMeta, context?: string): void {
    this.logger.log(level, message, this.buildMeta(context, meta));
  }
}
