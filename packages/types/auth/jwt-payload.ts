export interface JwtPayload {
  sub: string; // user id
  email: string;
  username: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}

export interface AuthResponse {
  message: string;
  accessToken: string;
  user: {
    id: string;
    email: string;
    username: string;
  };
}

export interface RefreshResponse {
  accessToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}
