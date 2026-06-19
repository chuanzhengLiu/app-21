import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequestContextService } from '../../observability/request-context';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly contextService: RequestContextService) {
    super();
  }

  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
    const result = super.handleRequest(err, user, info, context, status);
    const authUser = result as any;
    if (authUser?.id !== undefined && authUser?.id !== null) {
      this.contextService.set('user_id', authUser.id);
    }
    return result as TUser;
  }
}
