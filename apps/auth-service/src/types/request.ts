import { Request } from 'express';
import { UserResponse } from '@fullstack-challenge/types/auth/jwt-payload';

export interface AuthenticatedRequest extends Request {
  user: UserResponse;
}

export interface CookieRequest extends Request {
  cookies: {
    refreshToken?: string;
  };
}