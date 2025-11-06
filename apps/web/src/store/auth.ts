import { create } from 'zustand'

export interface User {
  id: string
  email: string
  username: string
}

export interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => {
  // Load from localStorage on initialization
  const loadFromStorage = () => {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        set({ user: parsed.user, token: parsed.token })
      } catch {
        // Ignore parse errors
      }
    }
  }

  return {
    user: null,
    token: null,
    setAuth: (user, token) => {
      set({ user, token })
      localStorage.setItem('auth-storage', JSON.stringify({ user, token }))
    },
    logout: () => {
      set({ user: null, token: null })
      localStorage.removeItem('auth-storage')
    },
    loadFromStorage,
  }
})

// Load from storage on app start
useAuthStore.getState().loadFromStorage()
