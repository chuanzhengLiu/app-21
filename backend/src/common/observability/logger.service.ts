import { Injectable, LoggerService } from '@nestjs/common';
import pino from 'pino';
import { RequestContext } from './request-context';

export interface LogContext {
  trace_id?: string;
  user_id?: string;
  method?: string;
  path?: string;
  status_code?: number;
  duration_ms?: number;
  [key: string]: any;
}

@Injectable()
export class AppLogger implements LoggerService {
  private logger: pino.Logger;

  constructor() {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => {
          return { level: label };
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: undefined,
    });
  }

  private getContextData(): LogContext {
    const ctx = RequestContext.get();
    if (!ctx) {
      return {};
    }

    return {
      trace_id: ctx.traceId,
      user_id: ctx.userId,
      method: ctx.method,
      path: ctx.path,
      status_code: ctx.statusCode,
      duration_ms: ctx.durationMs,
    };
  }

  private buildLogObject(message: any, context?: string, extra?: LogContext): Record<string, any> {
    const ctxData = this.getContextData();
    return {
      msg: typeof message === 'string' ? message : JSON.stringify(message),
      context: context,
      ...ctxData,
      ...extra,
    };
  }

  log(message: any, context?: string, extra?: LogContext): void {
    this.logger.info(this.buildLogObject(message, context, extra));
  }

  error(message: any, trace?: string, context?: string, extra?: LogContext): void {
    const logObj = this.buildLogObject(message, context, extra);
    if (trace) {
      logObj.stack = trace;
    }
    this.logger.error(logObj);
  }

  warn(message: any, context?: string, extra?: LogContext): void {
    this.logger.warn(this.buildLogObject(message, context, extra));
  }

  debug(message: any, context?: string, extra?: LogContext): void {
    this.logger.debug(this.buildLogObject(message, context, extra));
  }

  verbose(message: any, context?: string, extra?: LogContext): void {
    this.logger.trace(this.buildLogObject(message, context, extra));
  }

  fatal(message: any, context?: string, extra?: LogContext): void {
    this.logger.fatal(this.buildLogObject(message, context, extra));
  }
}
