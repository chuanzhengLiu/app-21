import { Global, Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContextService } from './request-context.service';
import { LoggerService } from './logger.service';
import { TracingMiddleware } from './tracing.middleware';
import { TracingInterceptor } from './tracing.interceptor';

@Global()
@Module({
  providers: [
    RequestContextService,
    LoggerService,
    TracingMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
  ],
  exports: [LoggerService, RequestContextService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TracingMiddleware).forRoutes('*');
  }
}
