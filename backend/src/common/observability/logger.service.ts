import { Injectable, Scope, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';
import { RequestContext } from './request-context';

export interface LogContext {
  trace_id?: string;
  user_id?: number;
  method?: string;
  path?: string;
  status_code?: number;
  duration_ms?: number;
  [key: string]: any;
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService implements NestLoggerService {
  private logger: pino.Logger;

  constructor(private readonly requestContext: RequestContext) {
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      formatters: {
        level: (label) => ({ level: label }),
        bindings: () => ({}),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: undefined,
    });
  }

  private getBaseContext(): LogContext {
    const ctx = this.requestContext.get();
    if (!ctx) return {};

    const context: LogContext = {
      trace_id: ctx.trace_id,
      method: ctx.method,
      path: ctx.path,
    };

    if (ctx.user_id !== undefined) {
      context.user_id = ctx.user_id;
    }

    return context;
  }

  private mergeContext(extra?: LogContext | Record<string, any>): LogContext {
    return { ...this.getBaseContext(), ...extra };
  }

  private formatNestArgs(message: any, ...optionalParams: any[]): { msg: string; ctx: LogContext } {
    let msg: string;
    let ctx: LogContext = {};

    if (typeof message === 'object') {
      msg = JSON.stringify(message);
    } else {
      msg = String(message);
    }

    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];
      if (typeof lastParam === 'string' && optionalParams.length === 1) {
        ctx.context = lastParam;
      } else {
        const errorParam = optionalParams.find((p) => p instanceof Error);
        if (errorParam) {
          ctx.err = {
            message: errorParam.message,
            stack: errorParam.stack,
            name: errorParam.name,
          };
        }
        const otherParams = optionalParams.filter((p) => typeof p !== 'string' && !(p instanceof Error));
        if (otherParams.length > 0) {
          ctx = { ...ctx, ...otherParams[0] };
        }
      }
    }

    return { msg, ctx };
  }

  log(message: any, ...optionalParams: any[]): void {
    const { msg, ctx } = this.formatNestArgs(message, ...optionalParams);
    this.logger.info(this.mergeContext(ctx), msg);
  }

  info(message: string, context?: LogContext): void {
    this.logger.info(this.mergeContext(context), message);
  }

  error(message: any, ...optionalParams: any[]): void {
    let msg: string;
    let ctx: LogContext = {};
    let trace: string | undefined;

    if (typeof message === 'object') {
      msg = JSON.stringify(message);
    } else {
      msg = String(message);
    }

    if (optionalParams.length > 0) {
      if (optionalParams[0] instanceof Error) {
        const err = optionalParams[0];
        ctx.err = {
          message: err.message,
          stack: err.stack,
          name: err.name,
        };
        trace = err.stack;
      } else if (typeof optionalParams[0] === 'string') {
        trace = optionalParams[0];
        ctx.context = optionalParams[1] || 'Application';
      }
    }

    if (trace) {
      ctx.trace = trace;
    }

    this.logger.error(this.mergeContext(ctx), msg);
  }

  warn(message: any, ...optionalParams: any[]): void {
    const { msg, ctx } = this.formatNestArgs(message, ...optionalParams);
    this.logger.warn(this.mergeContext(ctx), msg);
  }

  debug(message: any, ...optionalParams: any[]): void {
    const { msg, ctx } = this.formatNestArgs(message, ...optionalParams);
    this.logger.debug(this.mergeContext(ctx), msg);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    const { msg, ctx } = this.formatNestArgs(message, ...optionalParams);
    this.logger.trace(this.mergeContext(ctx), msg);
  }

  trace(message: string, context?: LogContext): void {
    this.logger.trace(this.mergeContext(context), message);
  }

  child(bindings: LogContext): LoggerService {
    const childLogger = this.logger.child(bindings);
    const self = this;
    return new (class extends LoggerService {
      constructor() {
        super(self.requestContext);
        (this as any).logger = childLogger;
      }
    })();
  }

  setLogLevels?(levels: string[]): void {
    const levelMap: Record<string, string> = {
      log: 'info',
      error: 'error',
      warn: 'warn',
      debug: 'debug',
      verbose: 'trace',
    };
    if (levels.length > 0) {
      const firstLevel = levels[0];
      this.logger.level = levelMap[firstLevel] || 'info';
    }
  }
}
