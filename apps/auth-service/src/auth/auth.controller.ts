import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  Get,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthenticatedRequest, CookieRequest } from '@fullstack-challenge/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);

    // Set refresh token in HTTP-only cookie (seguro contra XSS)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, // Não acessível via JavaScript
      secure: process.env.NODE_ENV === 'production', // HTTPS only em prod
      sameSite: 'strict', // Proteção CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    // Retorna APENAS accessToken e user - refreshToken NUNCA sai no body
    return {
      message: result.message,
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(@Req() req: CookieRequest) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found in cookies');
    }
    return this.authService.refresh(refreshToken);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getMe(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'auth-service' };
  }
}
