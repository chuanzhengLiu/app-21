import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get, Injectable, UseGuards, CanActivate, ExecutionContext, applyDecorators, SetMetadata, createParamDecorator } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { firstValueFrom } from 'rxjs';
import * as http from 'http';

import { ObservabilityModule } from '../src/common/observability/observability.module';
import { LoggerService } from '../src/common/observability/logger.service';
import { RequestContextService } from '../src/common/observability/request-context.service';

@Injectable()
class TestBusinessService {
  constructor(private readonly logger: LoggerService) {}

  async doWork(requestId: string) {
    this.logger.log(`Service processing step 1 for ${requestId}`, 'TestBusinessService');
    await new Promise((r) => setTimeout(r, 10));
    this.logger.debug(`Service processing step 2 for ${requestId}`, 'TestBusinessService');
    await new Promise((r) => setTimeout(r, 5));
    this.logger.log(`Service completed for ${requestId}`, 'TestBusinessService');
    return { result: `ok-${requestId}` };
  }
}

@Controller('test')
class TestController {
  constructor(
    private readonly businessService: TestBusinessService,
    private readonly logger: LoggerService,
  ) {}

  @Get('public')
  async publicEndpoint() {
    this.logger.log('Public endpoint hit', 'TestController');
    const result = await this.businessService.doWork('public-' + Date.now());
    return { status: 'ok', ...result };
  }

  @Get('error')
  async errorEndpoint() {
    this.logger.warn('About to throw an error', 'TestController');
    throw new Error('Simulated business error for trace testing');
  }
}

@Injectable()
class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const userId = req.header('x-test-user-id');
    if (userId) {
      req.user = { id: parseInt(userId, 10), role: 'user' };
    }
    return true;
  }
}

@Controller('auth-test')
class AuthTestController {
  constructor(private readonly logger: LoggerService) {}

  @Get('protected')
  @UseGuards(MockAuthGuard)
  async protectedEndpoint() {
    this.logger.log('Protected endpoint accessed', 'AuthTestController');
    return { status: 'authenticated' };
  }
}

@Module({
  imports: [ObservabilityModule],
  controllers: [TestController, AuthTestController],
  providers: [TestBusinessService, MockAuthGuard],
})
class TestAppModule {}

interface ParsedLogEntry {
  level: string;
  time: string;
  msg: string;
  trace_id?: string;
  method?: string;
  path?: string;
  status_code?: number;
  duration_ms?: number;
  user_id?: number;
  context?: string;
  service?: string;
  err?: any;
  [key: string]: any;
}

function sendRequest(port: number, path: string, headers: Record<string, string> = {}): Promise<{
  statusCode: number;
  traceId: string | undefined;
  body: string;
}> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            traceId: res.headers['x-trace-id'] as string | undefined,
            body,
          });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const logs: ParsedLogEntry[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk: any, ...args: any[]): boolean => {
    const text = chunk.toString().trim();
    if (text) {
      try {
        const entry = JSON.parse(text);
        logs.push(entry);
      } catch {
        // pino-pretty output, skip
      }
    }
    return originalWrite(chunk, ...args);
  };

  const app = await NestFactory.create<NestExpressApplication>(TestAppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  const port = 19876;
  await app.listen(port);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  PASS: ${name}`);
      passed++;
    } else {
      console.log(`  FAIL: ${name}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  console.log('\n=== Test 1: Single public request - trace_id consistency within chain ===\n');
  const requestLogsBefore = logs.length;
  const resp1 = await sendRequest(port, '/test/public');
  await new Promise((r) => setTimeout(r, 200));

  assert(resp1.statusCode === 200, 'Response status is 200', `got ${resp1.statusCode}`);
  assert(!!resp1.traceId, 'Response X-Trace-Id header is present', `traceId=${resp1.traceId}`);

  const req1Logs = logs.filter((l) => l.trace_id === resp1.traceId);
  console.log(`  Found ${req1Logs.length} log entries for trace_id ${resp1.traceId}`);

  assert(req1Logs.length >= 3, 'At least 3 log entries for single request', `found ${req1Logs.length}`);

  const allSameTraceId = req1Logs.every((l) => l.trace_id === resp1.traceId);
  assert(allSameTraceId, 'All logs share the same trace_id');

  const accessLog = req1Logs.find((l) => l.msg === 'request completed');
  assert(!!accessLog, 'Access log entry (request completed) exists');
  if (accessLog) {
    assert(accessLog.method === 'GET', 'Access log has method=GET', `got ${accessLog.method}`);
    assert(accessLog.path === '/test/public', 'Access log has correct path', `got ${accessLog.path}`);
    assert(accessLog.status_code === 200, 'Access log has status_code=200', `got ${accessLog.status_code}`);
    assert(typeof accessLog.duration_ms === 'number', 'Access log has duration_ms (number)', `got ${typeof accessLog.duration_ms}`);
    assert(accessLog.user_id === null, 'Unauthenticated access log has user_id=null', `got ${JSON.stringify(accessLog.user_id)}`);
  }

  const serviceLogs = req1Logs.filter((l) => l.context === 'TestBusinessService');
  assert(serviceLogs.length >= 2, 'Service-level logs carry trace_id', `found ${serviceLogs.length}`);

  console.log('\n=== Test 2: Concurrent requests - trace_id isolation ===\n');
  const concurrentCount = 5;
  const responses = await Promise.all(
    Array.from({ length: concurrentCount }, (_, i) =>
      sendRequest(port, `/test/public?i=${i}`),
    ),
  );
  await new Promise((r) => setTimeout(r, 500));

  const traceIds = responses.map((r) => r.traceId).filter(Boolean) as string[];
  assert(traceIds.length === concurrentCount, `All ${concurrentCount} responses have trace_id`, `got ${traceIds.length}`);

  const uniqueTraceIds = new Set(traceIds);
  assert(uniqueTraceIds.size === concurrentCount, 'All concurrent requests have unique trace_ids', `${uniqueTraceIds.size} unique out of ${concurrentCount}`);

  for (const tid of traceIds) {
    const logsForTrace = logs.filter((l) => l.trace_id === tid);
    const allMatch = logsForTrace.every((l) => l.trace_id === tid);
    assert(allMatch, `Logs for trace ${tid.substring(0, 8)}... all have matching trace_id`, `${logsForTrace.length} logs`);
  }

  console.log('\n=== Test 3: Authenticated request includes user_id ===\n');
  const authResp = await sendRequest(port, '/auth-test/protected', { 'x-test-user-id': '42' });
  await new Promise((r) => setTimeout(r, 200));

  assert(authResp.statusCode === 200, 'Auth response status is 200', `got ${authResp.statusCode}`);
  assert(!!authResp.traceId, 'Auth response has trace_id');

  const authLogs = logs.filter((l) => l.trace_id === authResp.traceId);
  const authAccessLog = authLogs.find((l) => l.msg === 'request completed');
  assert(!!authAccessLog, 'Auth access log exists');
  if (authAccessLog) {
    assert(authAccessLog.user_id === 42, 'Auth access log includes user_id=42', `got ${authAccessLog.user_id}`);
  }

  console.log('\n=== Test 4: Error request includes correct status_code ===\n');
  const errorResp = await sendRequest(port, '/test/error');
  await new Promise((r) => setTimeout(r, 200));

  assert(errorResp.statusCode === 500, 'Error response status is 500', `got ${errorResp.statusCode}`);
  const errorLogs = logs.filter((l) => l.trace_id === errorResp.traceId);
  const errorAccessLog = errorLogs.find((l) => l.msg === 'request completed');
  assert(!!errorAccessLog, 'Error access log exists');
  if (errorAccessLog) {
    assert(errorAccessLog.status_code === 500, 'Error access log has status_code=500', `got ${errorAccessLog.status_code}`);
  }
  const errorEntry = errorLogs.find((l) => l.level === 'error' && l.err);
  assert(!!errorEntry, 'Error log entry with err field exists');
  if (errorEntry) {
    assert(errorEntry.err.type === 'Error', 'err.type is "Error" (not "Object")', `got ${errorEntry.err.type}`);
    assert(!!errorEntry.err.message, 'err.message is present');
    assert(!!errorEntry.err.stack, 'err.stack is present');
  }

  console.log('\n=== Test 5: Inbound trace_id propagation (X-Trace-Id header) ===\n');
  const inboundTraceId = 'custom-trace-abc123';
  const propResp = await sendRequest(port, '/test/public', { 'x-trace-id': inboundTraceId });
  await new Promise((r) => setTimeout(r, 200));

  assert(propResp.traceId === inboundTraceId, 'Inbound X-Trace-Id is preserved and returned', `got ${propResp.traceId}`);
  const propLogs = logs.filter((l) => l.trace_id === inboundTraceId);
  assert(propLogs.length > 0, 'Logs use the propagated trace_id', `found ${propLogs.length} logs`);

  await app.close();

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Verification script failed:', err);
  process.exit(1);
});
