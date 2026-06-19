import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContextService } from './request-context.service';
import { LoggerService } from './logger.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  private readonly fallbackLogger = new Logger('HTTP');

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly logger: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const incomingTraceId = req.header('x-trace-id');
    const traceId = incomingTraceId && incomingTraceId.length > 0 ? incomingTraceId : uuidv4();
    const startAt = Date.now();

    const ctx = {
      trace_id: traceId,
      method: req.method,
      path: req.originalUrl || req.url,
      start_at: startAt,
      user_id: null,
    };

    this.requestContext.run(ctx, () => {
      res.setHeader('X-Trace-Id', traceId);

      const logRequest = () => {
        const duration = Date.now() - startAt;
        const statusCode = res.statusCode;
        const logData: Record<string, unknown> = {
          trace_id: ctx.trace_id,
          method: ctx.method,
          path: ctx.path,
          status_code: statusCode,
          duration_ms: duration,
          user_id: ctx.user_id ?? null,
        };
        const ip = req.ip || req.socket?.remoteAddress;
        if (ip) {
          logData.ip = ip;
        }
        const contentLength = res.getHeader('content-length');
        if (contentLength) {
          logData.response_size = Number(contentLength);
        }

        if (statusCode >= 500) {
          this.logger.raw.error(logData, 'request completed');
        } else if (statusCode >= 400) {
          this.logger.raw.warn(logData, 'request completed');
        } else {
          this.logger.raw.info(logData, 'request completed');
        }
      };

      res.on('finish', logRequest);
      res.on('close', () => {
        if (!res.writableEnded) {
          const duration = Date.now() - startAt;
          this.logger.raw.warn(
            {
              trace_id: ctx.trace_id,
              method: ctx.method,
              path: ctx.path,
              duration_ms: duration,
              user_id: ctx.user_id,
            },
            'request interrupted (client disconnected)',
          );
        }
      });

      next();
    });
  }
}
