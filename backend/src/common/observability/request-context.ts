import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  traceId: string;
  userId?: string;
  method: string;
  path: string;
  startTime: number;
  statusCode?: number;
  durationMs?: number;
}

export class RequestContext {
  private static storage = new AsyncLocalStorage<RequestContextData>();

  static run<T>(context: RequestContextData, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  static get(): RequestContextData | undefined {
    return this.storage.getStore();
  }

  static getTraceId(): string | undefined {
    return this.storage.getStore()?.traceId;
  }

  static getUserId(): string | undefined {
    return this.storage.getStore()?.userId;
  }

  static setUserId(userId: string): void {
    const store = this.storage.getStore();
    if (store) {
      store.userId = userId;
    }
  }

  static setStatusCode(statusCode: number): void {
    const store = this.storage.getStore();
    if (store) {
      store.statusCode = statusCode;
    }
  }

  static setDurationMs(durationMs: number): void {
    const store = this.storage.getStore();
    if (store) {
      store.durationMs = durationMs;
    }
  }

  private static base64UrlDecode(str: string): string {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  static extractUserIdFromToken(authHeader: string | undefined): string | undefined {
    if (!authHeader) {
      return undefined;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return undefined;
    }

    const token = parts[1];
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(RequestContext.base64UrlDecode(payload));
      const userId = decoded.userId || decoded.id || decoded.sub;
      return userId ? String(userId) : undefined;
    } catch {
      return undefined;
    }
  }
}
