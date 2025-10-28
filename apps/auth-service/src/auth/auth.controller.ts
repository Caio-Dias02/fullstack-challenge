import { Body, Controller, Post, Res, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from '@fullstack-challenge/types/auth/register.dto';
import { LoginDto } from '@fullstack-challenge/types/auth/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: any) {
    const result = await this.authService.login(dto);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const { refreshToken, ...response } = result;
    return response;
  }

  @Post('refresh')
  refresh(@Req() req: any) {
    const refreshToken = req.cookies?.refreshToken;
    return this.authService.refresh(refreshToken);
  }
}
