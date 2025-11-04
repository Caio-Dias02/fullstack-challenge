import { Controller, Post, Body, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from '../../../../packages/types';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(dto);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
    });

    return {
      message: 'Login successful',
      accessToken, // Gateway precisa disso para criar seu cookie
      user: { id: user.id, email: user.email, username: user.username },
    };
  }

  @Post('refresh')
  async refresh(@Req() req: Request) {
    const token = req.cookies['refreshToken'];
    return this.authService.refresh(token);
  }
}
