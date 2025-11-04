import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthService {
  constructor(private readonly http: HttpService) {}

  private baseUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001/auth';

  async register(dto: any) {
    const { data } = await firstValueFrom(this.http.post(`${this.baseUrl}/register`, dto));
    return data;
  }

  async login(dto: any, res: any) {
    const { data } = await firstValueFrom(this.http.post(`${this.baseUrl}/login`, dto, { withCredentials: true }));
    // replica o cookie do auth-service no gateway
    if (data.refreshToken) {
      res.cookie('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }
    return data;
  }

  async refresh(body: any) {
    const { data } = await firstValueFrom(this.http.post(`${this.baseUrl}/refresh`, body));
    return data;
  }
}
