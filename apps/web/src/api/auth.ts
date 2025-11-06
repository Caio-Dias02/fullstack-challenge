import { apiClient } from './client'
import { User } from '../store/auth'

export interface LoginRequest {
  email?: string
  username?: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export const authAPI = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/register', data)
    return res.data
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/login', data)
    return res.data
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me')
    return res.data
  },

  refresh: async (): Promise<AuthResponse> => {
    const res = await apiClient.post('/auth/refresh')
    return res.data
  },
}
