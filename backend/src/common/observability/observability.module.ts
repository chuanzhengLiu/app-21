import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestContext } from './request-context';
import { LoggerService } from './logger.service';
import { TracingMiddleware } from './tracing.middleware';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  providers: [
    RequestContext,
    LoggerService,
    TracingMiddleware,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [RequestContext, LoggerService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TracingMiddleware).forRoutes('*');
  }
}
