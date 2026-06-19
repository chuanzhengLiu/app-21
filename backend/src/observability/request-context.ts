import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';

export interface RequestContext {
  trace_id: string;
  user_id?: string | number | null;
  method?: string;
  path?: string;
  start_time?: number;
}

@Injectable()
export class RequestContextService {
  private static readonly storage = new AsyncLocalStorage<RequestContext>();

  static getStorage(): AsyncLocalStorage<RequestContext> {
    return RequestContextService.storage;
  }

  run<T>(context: RequestContext, callback: () => T): T {
    return RequestContextService.storage.run(context, callback);
  }

  get(): RequestContext | undefined {
    return RequestContextService.storage.getStore();
  }

  getTraceId(): string | undefined {
    return RequestContextService.storage.getStore()?.trace_id;
  }

  set<K extends keyof RequestContext>(key: K, value: RequestContext[K]): void {
    const store = RequestContextService.storage.getStore();
    if (store) {
      store[key] = value;
    }
  }
}
