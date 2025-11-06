import { Controller, Post, Body, Res, Req, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

  constructor(private readonly httpService: HttpService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({
    description: 'User registration data',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        username: { type: 'string', example: 'username' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'username', 'password'],
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async register(@Body() registerDto: any) {
    const response = await firstValueFrom(
      this.httpService.post(`${this.authServiceUrl}/auth/register`, registerDto)
    );
    return response.data;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email or username' })
  @ApiBody({
    description: 'User login credentials',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful, tokens in cookies' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'New access token generated' })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired' })
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

  @UseGuards(JwtAuthGuard)
  @Get('users/search')
  @ApiOperation({ summary: 'Search users by email or username' })
  @ApiResponse({ status: 200, description: 'Users found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchUsers(@Query('q') query: string, @Req() req: Request) {
    const response = await firstValueFrom(
      this.httpService.get(`${this.authServiceUrl}/auth/users/search`, {
        params: { q: query },
        headers: { Authorization: req.headers.authorization || '' },
      })
    );
    return response.data;
  }
}
