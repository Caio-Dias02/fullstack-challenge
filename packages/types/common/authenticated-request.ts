import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

export interface CookieRequest extends Request {
  cookies: {
    refreshToken?: string;
  };
}
