import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/api/auth/login', { email, password })
        localStorage.setItem('orderly_token', data.token)
        set({ user: data.user, token: data.token, isAuthenticated: true })
        return data.user
      },

      logout: () => {
        localStorage.removeItem('orderly_token')
        set({ user: null, token: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        try {
          const { data } = await api.get('/api/auth/me')
          set({ user: data.user, isAuthenticated: true })
        } catch {
          get().logout()
        }
      },
    }),
    {
      name: 'orderly_auth',
      partialize: state => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
)

export default useAuthStore
