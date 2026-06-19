import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext, RequestContextData } from './request-context';
import { LoggerService } from './logger.service';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContext: RequestContext,
    private readonly logger: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = (req.headers['x-trace-id'] as string) || uuidv4();
    const startTime = Date.now();

    res.setHeader('x-trace-id', traceId);

    const ctxData: RequestContextData = {
      trace_id: traceId,
      method: req.method,
      path: req.originalUrl || req.url,
      start_time: startTime,
    };

    res.on('finish', () => {
      const durationMs = Date.now() - ctxData.start_time;
      const completionContext: Record<string, any> = {
        trace_id: ctxData.trace_id,
        method: ctxData.method,
        path: ctxData.path,
        status_code: res.statusCode,
        duration_ms: durationMs,
      };
      if (ctxData.user_id !== undefined) {
        completionContext.user_id = ctxData.user_id;
      }
      this.logger.info('Request completed', completionContext);
    });

    res.on('close', () => {
      if (!res.writableFinished) {
        const durationMs = Date.now() - ctxData.start_time;
        const closeContext: Record<string, any> = {
          trace_id: ctxData.trace_id,
          method: ctxData.method,
          path: ctxData.path,
          status_code: res.statusCode,
          duration_ms: durationMs,
        };
        if (ctxData.user_id !== undefined) {
          closeContext.user_id = ctxData.user_id;
        }
        this.logger.warn('Request connection closed prematurely', closeContext);
      }
    });

    this.requestContext.run(ctxData, () => {
      this.logger.info('Incoming request', {
        ip: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
      });
      next();
    });
  }
}
