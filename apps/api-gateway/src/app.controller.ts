import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'API Gateway is healthy' })
  getHealth() {
    return { status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
