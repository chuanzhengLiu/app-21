import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RequestContext } from './request-context';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly requestContext: RequestContext,
    private readonly logger: LoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request & { user?: { id?: number } }>();
    const response = ctx.getResponse<Response>();

    if (request.user?.id) {
      this.requestContext.setUserId(request.user.id);
    }

    return next.handle().pipe(
      tap(() => {
        const reqCtx = this.requestContext.get();
        if (reqCtx) {
          const durationMs = Date.now() - reqCtx.start_time;
          this.logger.debug('Response sent', {
            status_code: response.statusCode,
            duration_ms: durationMs,
          });
        }
      }),
      catchError((error) => {
        const reqCtx = this.requestContext.get();
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        if (reqCtx) {
          const durationMs = Date.now() - reqCtx.start_time;
          this.logger.error(
            'Request failed',
            error,
            {
              status_code: statusCode,
              duration_ms: durationMs,
            },
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
