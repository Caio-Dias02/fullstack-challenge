import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // Tenta pegar do cookie primeiro (HTTP-only)
    let token = req.cookies?.accessToken;

    // Fallback: tenta header Authorization (Bearer token)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      throw new UnauthorizedException('Token ausente ou inválido');
    }

    try {
      const payload = this.jwtService.verify(token);
      req.user = payload;
      return true;
    } catch (err: any) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
