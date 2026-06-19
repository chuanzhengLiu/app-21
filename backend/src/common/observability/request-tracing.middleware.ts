import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from './request-context';
import { AppLogger } from './logger.service';

@Injectable()
export class RequestTracingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLogger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = req.headers['x-trace-id'] as string || uuidv4();
    const startTime = Date.now();
    const method = req.method;
    const path = req.originalUrl || req.url;
    const userId = RequestContext.extractUserIdFromToken(req.headers.authorization);

    const contextData = {
      traceId,
      method,
      path,
      startTime,
      userId,
    };

    res.setHeader('x-trace-id', traceId);

    RequestContext.run(contextData, () => {
      this.logger.log(`Incoming request: ${method} ${path}`, 'RequestTracing');

      const originalEnd = res.end.bind(res);
      const self = this;

      res.end = function (...args: any[]): any {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;

        RequestContext.setStatusCode(statusCode);
        RequestContext.setDurationMs(durationMs);

        self.logger.log(
          `Request completed: ${method} ${path} ${statusCode}`,
          'RequestTracing',
        );

        return originalEnd(...args);
      };

      next();
    });
  }
}
