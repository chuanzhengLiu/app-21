import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RequestContext } from './request-context';

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.userId) {
      RequestContext.setUserId(user.userId);
    } else if (user && user.id) {
      RequestContext.setUserId(String(user.id));
    } else if (user && user.sub) {
      RequestContext.setUserId(String(user.sub));
    }

    return next.handle();
  }
}
