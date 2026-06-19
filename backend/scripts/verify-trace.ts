/* eslint-disable no-console */
/**
 * Verification script for request-scoped trace_id propagation.
 *
 * Boots a minimal NestJS application that uses ObservabilityModule, fires
 * concurrent HTTP requests that each produce multiple log lines via the
 * Nest Logger / AppLoggerService, and asserts that:
 *   1. All log lines emitted within a single request share the same trace_id.
 *   2. Different concurrent requests produce distinct trace_ids.
 *   3. Each request log carries method, path, status_code and duration_ms.
 *
 * Usage:
 *   npx ts-node --project backend/scripts/tsconfig.json backend/scripts/verify-trace.ts
 */
import 'reflect-metadata';
import * as http from 'http';
import { AddressInfo } from 'net';
import { Writable } from 'stream';
import {
  Controller,
  Get,
  Injectable,
  Logger,
  Module,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import * as winston from 'winston';
import { ObservabilityModule } from '../src/observability/observability.module';
import { AppLoggerService } from '../src/observability/logger.service';
import { RequestContextService } from '../src/observability/request-context';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

interface CapturedLog {
  level: string;
  message: string;
  context?: string;
  trace_id?: string;
  user_id?: string | number | null;
  method?: string;
  path?: string;
  status_code?: number;
  duration_ms?: number;
  [k: string]: any;
}

const captured: CapturedLog[] = [];

class CaptureStream extends Writable {
  _write(chunk: any, _enc: string, callback: (err?: Error | null) => void): void {
    const text = chunk.toString();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        captured.push(JSON.parse(trimmed));
      } catch {
        // ignore non-JSON lines
      }
    }
    callback();
  }
}

@Injectable()
class WorkerService {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly ctx: RequestContextService,
  ) {}

  async work(label: string): Promise<{ label: string; trace_id?: string }> {
    this.logger.log(`step-1 enter ${label}`);
    await new Promise((r) => setTimeout(r, 10 + Math.floor(Math.random() * 30)));
    this.appLogger.structured('info', 'business_event', {
      stage: 'mid',
      label,
    });
    await new Promise((r) => setTimeout(r, 5));
    this.logger.log(`step-2 leave ${label}`);
    return { label, trace_id: this.ctx.getTraceId() };
  }
}

@Controller('verify')
class VerifyController {
  constructor(private readonly worker: WorkerService) {}

  @Get(':label')
  async handle(@Param('label') label: string) {
    return this.worker.work(label);
  }

  @Get('secure/:label')
  @UseGuards(JwtAuthGuard)
  async handleSecure(@Param('label') label: string) {
    return this.worker.work(`secure-${label}`);
  }
}

@Module({
  imports: [
    ObservabilityModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: { expiresIn: '5m' },
    }),
  ],
  controllers: [VerifyController],
  providers: [WorkerService, JwtStrategy],
})
class VerifyAppModule {}

async function fire(
  port: number,
  label: string,
  options?: { token?: string; pathPrefix?: string },
): Promise<{ label: string; bodyTraceId?: string; headerTraceId?: string; status: number }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (options?.token) headers.authorization = `Bearer ${options.token}`;
    const path = `${options?.pathPrefix ?? '/verify'}/${label}`;
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            const text = Buffer.concat(chunks).toString('utf-8');
            const body = text ? JSON.parse(text) : {};
            resolve({
              label,
              bodyTraceId: body.trace_id,
              headerTraceId: (res.headers['x-trace-id'] as string) || undefined,
              status: res.statusCode || 0,
            });
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

let failures = 0;
function assert(condition: boolean, message: string): void {
  if (!condition) {
    failures += 1;
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

async function main() {
  process.env.LOG_SILENT = 'true';

  const app = await NestFactory.create<NestExpressApplication>(VerifyAppModule, {
    bufferLogs: true,
    logger: false,
  });

  const appLogger = app.get(AppLoggerService);
  app.useLogger(appLogger);

  const innerLogger: winston.Logger = (appLogger as any).logger;
  innerLogger.add(
    new winston.transports.Stream({
      stream: new CaptureStream(),
      level: 'silly',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  );

  await app.listen(0);
  const server = app.getHttpServer();
  const address = server.address() as AddressInfo;
  const port = address.port;

  const labels = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
  const results = await Promise.all(labels.map((l) => fire(port, l)));

  const traceIds = new Set<string>();
  for (const r of results) {
    assert(!!r.bodyTraceId, `request ${r.label}: response carries trace_id`);
    assert(
      !!r.headerTraceId && r.headerTraceId === r.bodyTraceId,
      `request ${r.label}: x-trace-id header matches in-context trace_id`,
    );
    if (r.bodyTraceId) traceIds.add(r.bodyTraceId);
  }
  assert(
    traceIds.size === results.length,
    `all ${results.length} concurrent requests produced distinct trace_ids`,
  );

  for (const r of results) {
    const traceId = r.bodyTraceId!;
    const lines = captured.filter((l) => l.trace_id === traceId);
    assert(
      lines.length >= 3,
      `request ${r.label} (${traceId}): captured >=3 structured log lines (got ${lines.length})`,
    );

    const allTraceIds = new Set(lines.map((l) => l.trace_id));
    assert(
      allTraceIds.size === 1 && allTraceIds.has(traceId),
      `request ${r.label}: all log lines share the same trace_id`,
    );

    const httpLine = lines.find((l) => l.message === 'http_request');
    assert(!!httpLine, `request ${r.label}: http_request summary log present`);
    if (httpLine) {
      assert(httpLine.method === 'GET', `request ${r.label}: method=GET captured`);
      assert(
        typeof httpLine.path === 'string' && httpLine.path.startsWith('/verify/'),
        `request ${r.label}: path captured (${httpLine.path})`,
      );
      assert(httpLine.status_code === 200, `request ${r.label}: status_code=200 captured`);
      assert(
        typeof httpLine.duration_ms === 'number' && httpLine.duration_ms >= 0,
        `request ${r.label}: duration_ms is a non-negative number (${httpLine.duration_ms})`,
      );
    }
  }

  if (results.length >= 2) {
    const requestATrace = results[0].bodyTraceId!;
    const requestBTrace = results[1].bodyTraceId!;
    const aLines = captured.filter((l) => l.trace_id === requestATrace);
    const bLines = captured.filter((l) => l.trace_id === requestBTrace);
    const aHasB = aLines.some((l) => l.trace_id === requestBTrace);
    const bHasA = bLines.some((l) => l.trace_id === requestATrace);
    assert(!aHasB && !bHasA, 'logs from different concurrent requests are isolated');
  }

  console.log('\n--- authenticated path verification ---');
  const jwtService = app.get(JwtService);
  const tokenA = jwtService.sign({ sub: 1001, role: 'admin', gym_id: 7 });
  const tokenB = jwtService.sign({ sub: 2002, role: 'user', gym_id: 7 });

  const secureResults = await Promise.all([
    fire(port, 'foo', { token: tokenA, pathPrefix: '/verify/secure' }),
    fire(port, 'bar', { token: tokenB, pathPrefix: '/verify/secure' }),
  ]);

  const expectations: Array<{ label: string; expectedUserId: number }> = [
    { label: 'foo', expectedUserId: 1001 },
    { label: 'bar', expectedUserId: 2002 },
  ];

  for (let i = 0; i < secureResults.length; i++) {
    const r = secureResults[i];
    const expectedUserId = expectations[i].expectedUserId;
    assert(r.status === 200, `secure ${r.label}: status=200 (got ${r.status})`);
    const traceId = r.bodyTraceId!;
    const lines = captured.filter((l) => l.trace_id === traceId);
    assert(lines.length >= 3, `secure ${r.label}: captured >=3 log lines (got ${lines.length})`);
    const allUserIds = new Set(lines.map((l) => l.user_id));
    assert(
      allUserIds.size === 1 && allUserIds.has(expectedUserId),
      `secure ${r.label}: every log line carries user_id=${expectedUserId} (got ${[...allUserIds].join(',')})`,
    );
    const httpLine = lines.find((l) => l.message === 'http_request');
    assert(!!httpLine && httpLine.user_id === expectedUserId, `secure ${r.label}: http_request log carries user_id=${expectedUserId}`);
    const businessLine = lines.find((l) => l.message === 'business_event');
    assert(!!businessLine && businessLine.user_id === expectedUserId, `secure ${r.label}: business_event log carries user_id=${expectedUserId}`);

    console.log(`\n[evidence] secure ${r.label} trace_id=${traceId}`);
    for (const l of lines) {
      const summary = {
        level: l.level,
        message: l.message,
        context: l.context,
        trace_id: l.trace_id,
        user_id: l.user_id,
        method: l.method,
        path: l.path,
        status_code: l.status_code,
        duration_ms: l.duration_ms,
      };
      console.log('  ' + JSON.stringify(summary));
    }
  }

  await app.close();

  if (failures > 0) {
    console.error(`\n${failures} assertion(s) failed.`);
    process.exit(1);
  }
  console.log('\nVerification complete: all assertions passed.');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
