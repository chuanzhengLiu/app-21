import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  trace_id: string;
  method: string;
  path: string;
  user_id?: number | null;
  start_at: number;
  status_code?: number;
  error?: Error;
}

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run<T>(ctx: RequestContextData, fn: () => T): T {
    return this.storage.run(ctx, fn);
  }

  get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  set<K extends keyof RequestContextData>(key: K, value: RequestContextData[K]): void {
    const store = this.storage.getStore();
    if (store) {
      store[key] = value;
    }
  }

  getTraceId(): string | undefined {
    return this.storage.getStore()?.trace_id;
  }

  getUserId(): number | null | undefined {
    return this.storage.getStore()?.user_id;
  }

  setUserId(userId: number | null): void {
    this.set('user_id', userId);
  }

  setStatusCode(code: number): void {
    this.set('status_code', code);
  }

  setError(error: Error): void {
    this.set('error', error);
  }
}
