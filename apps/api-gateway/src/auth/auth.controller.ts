import { Controller, Post, Body, Res, Req, Get, UseGuards, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with email, username and password. Password must be at least 8 characters long. Email must be valid. Username must be 3-30 characters and alphanumeric with underscores/hyphens only.'
  })
  @ApiBody({
    description: 'User registration credentials',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com', description: 'Valid email address (RFC 5322)' },
        username: { type: 'string', example: 'john_doe', description: 'Username (3-30 chars, alphanumeric + _ -)' },
        password: { type: 'string', example: 'SecurePass123', description: 'Password (min 8 characters)' },
      },
      required: ['email', 'username', 'password'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'User created successfully' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation failed - invalid email/username/password format' })
  @ApiResponse({ status: 409, description: 'Email or username already in use' })
  async register(@Body() registerDto: any) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/register`, registerDto)
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw error.response.data;
      }
      throw error;
    }
  }

  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user',
    description: 'Login with email and password. Returns access token and refresh token (in httpOnly cookie). Access token expires in 15 minutes.'
  })
  @ApiBody({
    description: 'User login credentials',
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'user@example.com', description: 'User email address' },
        password: { type: 'string', example: 'SecurePass123', description: 'User password' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - tokens returned',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Login successful' },
        accessToken: { type: 'string', description: 'JWT access token (15min expiry)' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            username: { type: 'string' },
          }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(
    @Body() loginDto: any,
    @Res({ passthrough: true }) res: Response
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.authServiceUrl}/auth/login`, loginDto, { withCredentials: true })
      );

      const { accessToken } = response.data;

      if (accessToken) {
        res.cookie('accessToken', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 15 * 60 * 1000,
        });
      }

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        res.status(401);
        return error.response.data;
      }
      throw error;
    }
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Use refresh token (from httpOnly cookie) to obtain a new access token. Refresh token valid for 7 days.'
  })
  @ApiResponse({
    status: 200,
    description: 'New access token generated',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string', description: 'New JWT access token (15min expiry)' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Refresh token missing, invalid or expired' })
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
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users', description: 'Retrieve list of all registered users in the system' })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async getAllUsers(@Req() req: Request) {
    const response = await firstValueFrom(
      this.httpService.get(`${this.authServiceUrl}/auth/users`, {
        headers: { Authorization: req.headers.authorization || '' },
      })
    );
    return response.data;
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/search')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search users', description: 'Search for users by email or username. Returns list of matching users.' })
  @ApiQuery({ name: 'q', description: 'Search query (email or username)', example: 'john', required: true })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - missing or invalid JWT token' })
  async searchUsers(@Query('q') query: string, @Req() req: Request) {
    const response = await firstValueFrom(
      this.httpService.get(`${this.authServiceUrl}/auth/users/search`, {
        params: { q: query },
        headers: { Authorization: req.headers.authorization || '' },
      })
    );
    return response.data;
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Retrieve a specific user by their UUID' })
  @ApiResponse({
    status: 200,
    description: 'User found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        username: { type: 'string' },
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.authServiceUrl}/auth/users/${id}`)
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw error.response.data;
      }
      throw error;
    }
  }
}
