import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { AppLoggerService } from './logger.service';
import { RequestContextService } from './request-context';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logger: AppLoggerService,
    private readonly contextService: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const ctx = this.contextService.get();
    const start = ctx?.start_time ?? Date.now();
    const method = req.method;
    const path = (req.originalUrl || req.url || '').split('?')[0];

    return next.handle().pipe(
      tap(() => {
        this.refreshUser(req);
        this.emit('info', req, res, method, path, start);
      }),
      catchError((err) => {
        this.refreshUser(req);
        const status =
          (err && typeof err.getStatus === 'function' && err.getStatus()) ||
          err?.status ||
          500;
        this.emit(status >= 500 ? 'error' : 'warn', req, res, method, path, start, status, err);
        return throwError(() => err);
      }),
    );
  }

  private refreshUser(req: Request): void {
    const userFromReq = (req as any).user;
    if (userFromReq?.id !== undefined && userFromReq?.id !== null) {
      this.contextService.set('user_id', userFromReq.id);
    }
  }

  private emit(
    level: 'info' | 'warn' | 'error',
    req: Request,
    res: Response,
    method: string,
    path: string,
    start: number,
    overrideStatus?: number,
    err?: any,
  ): void {
    const status_code = overrideStatus ?? res.statusCode;
    const duration_ms = Date.now() - start;
    const ctx = this.contextService.get();
    this.logger.structured(
      level,
      'http_request',
      {
        method,
        path,
        status_code,
        duration_ms,
        trace_id: ctx?.trace_id,
        user_id: ctx?.user_id ?? null,
        ...(err
          ? {
              error_name: err?.name,
              error_message: err?.message,
            }
          : {}),
      },
      'HTTP',
    );
  }
}
