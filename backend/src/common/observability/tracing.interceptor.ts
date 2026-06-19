import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.user && typeof request.user === 'object') {
      const userId = (request.user as any).id;
      if (userId !== undefined && userId !== null) {
        this.requestContext.setUserId(Number(userId));
      }
    }

    return next.handle().pipe(
      tap(() => {
        const ctx = this.requestContext.get();
        if (ctx && !ctx.status_code) {
          ctx.status_code = response.statusCode;
        }
      }),
      catchError((err) => {
        const ctx = this.requestContext.get();
        if (ctx) {
          if (err instanceof HttpException) {
            ctx.status_code = err.getStatus();
          } else {
            ctx.status_code = HttpStatus.INTERNAL_SERVER_ERROR;
          }
          ctx.error = err instanceof Error ? err : new Error(String(err));
        }
        return throwError(() => err);
      }),
    );
  }
}
