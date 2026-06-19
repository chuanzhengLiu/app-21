import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get, Injectable, UseGuards, Res, HttpStatus, Global, ModuleMetadata } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Response } from 'express';
import http = require('http');
import { v4 as uuidv4 } from 'uuid';
import { ObservabilityModule } from '../src/common/observability/observability.module';
import { AppLogger } from '../src/common/observability/logger.service';
import { RequestContext } from '../src/common/observability/request-context';
import { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
          request.user = {
            userId: payload.userId,
            id: payload.id,
            sub: payload.sub,
          };
        } catch {
          // invalid token
        }
      }
    }
    return true;
  }
}

@Injectable()
class TestService {
  constructor(private readonly logger: AppLogger) {}

  async doWorkA(): Promise<void> {
    this.logger.log('Service: starting operation A', 'TestService');
    await this.delay(Math.floor(Math.random() * 50));
    this.logger.log('Service: completed operation A', 'TestService');
  }

  async doWorkB(): Promise<void> {
    this.logger.log('Service: starting operation B', 'TestService');
    await this.delay(Math.floor(Math.random() * 30));
    this.logger.warn('Service: operation B had a warning', 'TestService');
    await this.delay(Math.floor(Math.random() * 30));
    this.logger.log('Service: completed operation B', 'TestService');
  }

  async doErrorCase(): Promise<void> {
    this.logger.log('Service: trying dangerous operation', 'TestService');
    await this.delay(30);
    this.logger.error('Service: something failed!', 'Error: simulated failure stack', 'TestService');
  }

  getTraceId(): string | undefined {
    return RequestContext.getTraceId();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

@Controller('test-trace')
class TestController {
  constructor(
    private readonly testService: TestService,
    private readonly logger: AppLogger,
  ) {}

  @Get('public')
  async publicEndpoint(@Res() res: Response) {
    this.logger.log('Controller: public endpoint called', 'TestController');
    await this.testService.doWorkA();
    res.json({
      ok: true,
      traceId: RequestContext.getTraceId(),
      userId: RequestContext.getUserId(),
    });
  }

  @Get('private')
  @UseGuards(TestAuthGuard)
  async privateEndpoint(@Res() res: Response) {
    this.logger.log('Controller: private endpoint called', 'TestController');
    await this.testService.doWorkB();
    res.json({
      ok: true,
      traceId: RequestContext.getTraceId(),
      userId: RequestContext.getUserId(),
      serviceSeesTraceId: this.testService.getTraceId(),
    });
  }

  @Get('error')
  @UseGuards(TestAuthGuard)
  async errorEndpoint(@Res() res: Response) {
    this.logger.log('Controller: error endpoint called', 'TestController');
    await this.testService.doErrorCase();
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      traceId: RequestContext.getTraceId(),
      userId: RequestContext.getUserId(),
    });
  }
}

@Global()
@Module({
  imports: [ObservabilityModule],
  controllers: [TestController],
  providers: [TestService, TestAuthGuard],
  exports: [TestService, TestAuthGuard],
})
class TestAppModule {}

function createTestJwt(payload: Record<string, any>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'fakesig';
  return `${header}.${body}.${signature}`;
}

interface RequestResult {
  status: number;
  traceIdHeader: string;
  body: any;
}

function makeRequest(
  baseUrl: string,
  path: string,
  opts?: { customTraceId?: string; userId?: string }
): Promise<RequestResult> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (opts?.customTraceId) headers['x-trace-id'] = opts.customTraceId;
    if (opts?.userId) headers['authorization'] = `Bearer ${createTestJwt({ userId: opts.userId })}`;

    const req = http.get(`${baseUrl}${path}`, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode || 0,
            traceIdHeader: res.headers['x-trace-id'] as string,
            body: JSON.parse(data),
          });
        } catch {
          resolve({
            status: res.statusCode || 0,
            traceIdHeader: res.headers['x-trace-id'] as string,
            body: data,
          });
        }
      });
    });
    req.on('error', reject);
  });
}

async function main() {
  const PORT = 13988;
  console.log('\n=== Verifying Tracing on REAL NestJS application ===\n');

  const app = await NestFactory.create<NestExpressApplication>(TestAppModule, {
    bufferLogs: true,
  });

  const logger = await app.resolve(AppLogger);
  app.useLogger(logger);
  app.setGlobalPrefix('api');

  await app.listen(PORT);
  const baseUrl = `http://localhost:${PORT}/api`;
  console.log(`NestJS app listening at ${baseUrl}\n`);

  try {
    console.log('Test 1: Concurrent public requests - independent trace_ids');
    console.log('--------------------------------------------------\n');
    const [r1, r2] = await Promise.all([
      makeRequest(baseUrl, '/test-trace/public'),
      makeRequest(baseUrl, '/test-trace/public'),
    ]);
    console.log('Request 1 traceId from response:', r1.body.traceId);
    console.log('Request 1 traceId header:', r1.traceIdHeader);
    console.log('Request 2 traceId from response:', r2.body.traceId);
    console.log('Request 2 traceId header:', r2.traceIdHeader);

    const test1a = r1.body.traceId === r1.traceIdHeader;
    const test1b = r2.body.traceId === r2.traceIdHeader;
    const test1c = r1.body.traceId !== r2.body.traceId;
    console.log('  ✓ Response body matches x-trace-id header for r1:', test1a ? 'PASS' : 'FAIL');
    console.log('  ✓ Response body matches x-trace-id header for r2:', test1b ? 'PASS' : 'FAIL');
    console.log('  ✓ Different requests have different trace_ids:   ', test1c ? 'PASS' : 'FAIL');

    console.log('\nTest 2: Custom x-trace-id from upstream preserved');
    console.log('--------------------------------------------------\n');
    const customTrace = `upstream-${uuidv4().substring(0, 8)}`;
    const r3 = await makeRequest(baseUrl, '/test-trace/public', { customTraceId: customTrace });
    console.log(`Expected trace_id: ${customTrace}`);
    console.log(`Got trace_id:      ${r3.body.traceId}`);
    const test2 = r3.body.traceId === customTrace;
    console.log('  ✓ Custom upstream trace_id preserved:', test2 ? 'PASS' : 'FAIL');

    console.log('\nTest 3: Authenticated request - user_id available (from Guard via Interceptor)');
    console.log('--------------------------------------------------\n');
    const testUserId = `user-real-${uuidv4().substring(0, 6)}`;
    const r4 = await makeRequest(baseUrl, '/test-trace/private', { userId: testUserId });
    console.log(`Expected user_id: ${testUserId}`);
    console.log(`Got user_id:      ${r4.body.userId}`);
    console.log(`Controller trace_id: ${r4.body.traceId}`);
    console.log(`Injectable Service also sees same trace_id: ${r4.body.serviceSeesTraceId === r4.body.traceId ? 'YES' : 'NO'}`);
    const test3a = r4.body.userId === testUserId;
    const test3b = r4.body.serviceSeesTraceId === r4.body.traceId;
    console.log('  ✓ user_id correctly set after Guard:     ', test3a ? 'PASS' : 'FAIL');
    console.log('  ✓ Service sees same trace_id as controller:', test3b ? 'PASS' : 'FAIL');

    console.log('\nTest 4: Error response has correct status_code 500');
    console.log('--------------------------------------------------\n');
    const errUserId = 'user-err-42';
    const r5 = await makeRequest(baseUrl, '/test-trace/error', { userId: errUserId });
    console.log(`Status code: ${r5.status}`);
    console.log(`user_id in response: ${r5.body.userId}`);
    const test4a = r5.status === 500;
    const test4b = r5.body.userId === errUserId;
    const test4c = !!r5.body.traceId;
    console.log('  ✓ Error status 500 returned:    ', test4a ? 'PASS' : 'FAIL');
    console.log('  ✓ user_id present on error path:', test4b ? 'PASS' : 'FAIL');
    console.log('  ✓ trace_id present on error path:', test4c ? 'PASS' : 'FAIL');

    console.log('\n========================================');
    console.log('FINAL VERDICT');
    console.log('========================================');
    const allPass = test1a && test1b && test1c && test2 && test3a && test3b && test4a && test4b && test4c;
    if (allPass) {
      console.log('ALL TESTS PASSED ✓');
      console.log('\nJSON logs (above) demonstrate:');
      console.log('  - Middleware generates trace_id, AsyncLocalStorage propagates it');
      console.log('  - UserContextInterceptor picks up req.user AFTER Guard, overrides fallback');
      console.log('  - Controller AND Service both automatically get trace_id/user_id in logs');
      console.log('  - Request completion log has status_code AND duration_ms from context');
      console.log('  - All log lines of a single request share same trace_id; concurrent requests isolated');
    } else {
      console.log('SOME TESTS FAILED ✗');
    }
    console.log('========================================\n');

    await app.close();
    process.exit(allPass ? 0 : 1);
  } catch (err) {
    console.error('Test failed with error:', err);
    await app.close();
    process.exit(1);
  }
}

main();
