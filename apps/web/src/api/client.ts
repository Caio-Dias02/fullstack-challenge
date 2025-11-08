import axios from 'axios'
import { useAuthStore } from '../store/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)
