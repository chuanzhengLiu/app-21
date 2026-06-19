import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext, RequestContextService } from './request-context';

const TRACE_HEADER = 'x-trace-id';
const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
  constructor(private readonly contextService: RequestContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const incoming =
      (req.headers[TRACE_HEADER] as string | undefined) ||
      (req.headers[REQUEST_ID_HEADER] as string | undefined);
    const trace_id = incoming && incoming.trim().length > 0 ? incoming.trim() : uuidv4();

    res.setHeader(TRACE_HEADER, trace_id);

    const userFromReq = (req as any).user;
    const user_id = userFromReq?.id ?? null;

    const context: RequestContext = {
      trace_id,
      user_id,
      method: req.method,
      path: req.originalUrl || req.url,
      start_time: Date.now(),
    };

    this.contextService.run(context, () => next());
  }
}
