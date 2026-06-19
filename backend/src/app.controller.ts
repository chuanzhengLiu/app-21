import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from './common/observability';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: LoggerService,
  ) {}

  @Get()
  getHello(): string {
    this.logger.debug('Processing hello request', { endpoint: 'root' });
    return this.appService.getHello();
  }

  @Get('health')
  health(): { status: string } {
    this.logger.info('Health check requested');
    return { status: 'ok' };
  }
}
