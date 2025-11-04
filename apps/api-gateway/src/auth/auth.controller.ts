import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  @Post('register')
  async register(@Body() registerDto: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.authServiceUrl}/auth/register`, registerDto)
    );
    return response.data;
  }

  @Post('login')
  async login(
    @Body() loginDto: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.authServiceUrl}/auth/login`, loginDto)
    );

    const { accessToken } = response.data;

    // Set cookies no gateway
    if (accessToken) {
      res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000, // 15 min
      });
    }

    return response.data;
  }

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const response = await firstValueFrom(
      this.httpService.post(
        `${this.authServiceUrl}/auth/refresh`,
        {},
        { headers: { cookie: req.headers.cookie || '' } }
      )
    );
    return response.data;
  }
}
