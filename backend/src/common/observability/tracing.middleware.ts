import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from './request-context';
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
    const method = req.method;
    const path = req.originalUrl || req.url;

    res.setHeader('x-trace-id', traceId);

    const contextData = {
      trace_id: traceId,
      method,
      path,
      start_time: startTime,
    };

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      this.logger.info('Request completed', {
        trace_id: traceId,
        method,
        path,
        status_code: res.statusCode,
        duration_ms: durationMs,
      });
    });

    res.on('close', () => {
      if (!res.writableFinished) {
        const durationMs = Date.now() - startTime;
        this.logger.warn('Request connection closed prematurely', {
          trace_id: traceId,
          method,
          path,
          status_code: res.statusCode,
          duration_ms: durationMs,
        });
      }
    });

    this.requestContext.run(contextData, () => {
      this.logger.info('Incoming request', {
        trace_id: traceId,
        method,
        path,
        ip: req.ip || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
      });
      next();
    });
  }
}
