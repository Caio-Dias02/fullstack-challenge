import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  health() {
    return { status: 'ok', service: 'notifications' };
  }

  @Get('health')
  healthCheck() {
    return { status: 'healthy' };
  }
}
