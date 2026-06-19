import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, Scope } from '@nestjs/common';

export interface RequestContextData {
  trace_id: string;
  user_id?: number;
  method: string;
  path: string;
  start_time: number;
}

@Injectable({ scope: Scope.DEFAULT })
export class RequestContext {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run<T>(data: RequestContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  setUserId(userId: number): void {
    const store = this.storage.getStore();
    if (store) {
      store.user_id = userId;
    }
  }

  getTraceId(): string | undefined {
    return this.storage.getStore()?.trace_id;
  }
}
