import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino from 'pino';
import { RequestContextService } from './request-context.service';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: pino.Logger;

  constructor(private readonly requestContext: RequestContextService) {
    const isDev = process.env.NODE_ENV !== 'production';
    const transport = isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname,service',
              messageFormat: '{msg} {context} {reqContext}',
            },
          },
        }
      : {};

    this.logger = pino({
      level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: { service: 'climbing-backend' },
      ...transport,
    });
  }

  get raw(): pino.Logger {
    return this.logger;
  }

  private requestBindings(): Record<string, unknown> {
    const ctx = this.requestContext.get();
    if (!ctx) return {};
    return {
      trace_id: ctx.trace_id,
      method: ctx.method,
      path: ctx.path,
      user_id: ctx.user_id ?? null,
    };
  }

  private extractContext(optionalParams: any[]): { context?: string; args: any[] } {
    if (optionalParams.length > 0 && typeof optionalParams[0] === 'string') {
      return { context: optionalParams[0], args: optionalParams.slice(1) };
    }
    return { args: optionalParams };
  }

  private extractErrorArgs(optionalParams: any[]): {
    context?: string;
    stackTrace?: string;
    args: any[];
  } {
    if (optionalParams.length === 0) return { args: [] };

    const first = optionalParams[0];
    const second = optionalParams[1];

    const looksLikeStack = (s: unknown): s is string =>
      typeof s === 'string' && s.includes('\n') && s.includes('    at ');

    if (looksLikeStack(first)) {
      if (typeof second === 'string') {
        return { stackTrace: first, context: second, args: optionalParams.slice(2) };
      }
      return { stackTrace: first, args: optionalParams.slice(1) };
    }

    if (typeof first === 'string') {
      if (looksLikeStack(second)) {
        if (typeof optionalParams[2] === 'string') {
          return { context: optionalParams[2], stackTrace: second, args: [first] };
        }
        return { stackTrace: second, args: [first] };
      }
      return { context: first, args: optionalParams.slice(1) };
    }

    return { args: optionalParams };
  }

  private formatMessage(message: any, args: any[]): string {
    const parts: string[] = [];
    if (message !== undefined && message !== null) {
      parts.push(typeof message === 'string' ? message : JSON.stringify(message));
    }
    for (const arg of args) {
      if (arg instanceof Error) {
        parts.push(arg.message);
      } else if (typeof arg === 'string') {
        parts.push(arg);
      } else {
        parts.push(JSON.stringify(arg));
      }
    }
    return parts.join(' ');
  }

  log(message: any, ...optionalParams: any[]): void {
    const { context, args } = this.extractContext(optionalParams);
    const bindings = { ...this.requestBindings(), ...(context ? { context } : {}) };
    this.logger.info(bindings, this.formatMessage(message, args));
  }

  error(message: any, ...optionalParams: any[]): void {
    const { context, stackTrace, args } = this.extractErrorArgs(optionalParams);
    const bindings: Record<string, unknown> = { ...this.requestBindings(), ...(context ? { context } : {}) };

    let error: Error | undefined;
    const msgArgs: any[] = [];

    if (message instanceof Error) {
      error = message;
    } else {
      msgArgs.push(message);
    }
    for (const arg of args) {
      if (arg instanceof Error) {
        error = arg;
      } else {
        msgArgs.push(arg);
      }
    }

    if (!error && stackTrace) {
      error = new Error(typeof message === 'string' ? message : 'Error');
      error.stack = stackTrace;
    }

    if (error) {
      bindings.err = error;
    }

    const ctx = this.requestContext.get();
    if (ctx?.error && !error) {
      bindings.err = ctx.error;
    }

    this.logger.error(bindings, this.formatMessage(msgArgs[0], msgArgs.slice(1)));
  }

  warn(message: any, ...optionalParams: any[]): void {
    const { context, args } = this.extractContext(optionalParams);
    const bindings = { ...this.requestBindings(), ...(context ? { context } : {}) };
    this.logger.warn(bindings, this.formatMessage(message, args));
  }

  debug(message: any, ...optionalParams: any[]): void {
    const { context, args } = this.extractContext(optionalParams);
    const bindings = { ...this.requestBindings(), ...(context ? { context } : {}) };
    this.logger.debug(bindings, this.formatMessage(message, args));
  }

  verbose(message: any, ...optionalParams: any[]): void {
    const { context, args } = this.extractContext(optionalParams);
    const bindings = { ...this.requestBindings(), ...(context ? { context } : {}) };
    this.logger.trace(bindings, this.formatMessage(message, args));
  }

  fatal(message: any, ...optionalParams: any[]): void {
    const { context, args } = this.extractContext(optionalParams);
    const bindings = { ...this.requestBindings(), ...(context ? { context } : {}) };
    this.logger.fatal(bindings, this.formatMessage(message, args));
  }

  info(message: any, ...optionalParams: any[]): void {
    this.log(message, ...optionalParams);
  }
}
